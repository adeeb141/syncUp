"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
} from "lucide-react";

const CURSOR_COLORS = [
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

const getRandomColor = () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

type DocumentAccess = "view_only" | "open_collab" | "selective";

interface TiptapEditorProps {
  roomName: string;
  workspaceId?: string;
  documentId?: string;
}

interface DocumentPermissionResponse {
  document: {
    id: string;
    access: DocumentAccess;
    created_by: string;
  };
  permissions: {
    can_edit: boolean;
    is_creator: boolean;
  };
}

interface EditorPermissionState {
  access: DocumentAccess;
  canEdit: boolean;
  isCreator: boolean;
}

export default function TiptapEditor({ roomName, workspaceId, documentId }: TiptapEditorProps) {
  const [status, setStatus] = useState<string>("connecting");
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const fallbackPermission = useMemo<EditorPermissionState>(
    () => ({
      access: "open_collab",
      canEdit: true,
      isCreator: true,
    }),
    []
  );
  const permissionKey = workspaceId && documentId ? `${workspaceId}:${documentId}` : null;
  const [permissionState, setPermissionState] = useState<{
    key: string;
    permission: EditorPermissionState | null;
    error: string | null;
  }>({
    key: permissionKey ?? "",
    permission: permissionKey ? null : fallbackPermission,
    error: null,
  });
  const user = useAuthStore((s) => s.user);
  const cursorColor = useMemo(() => getRandomColor(), []);

  const permission =
    permissionKey && permissionState.key === permissionKey
      ? permissionState.permission
      : permissionKey
      ? null
      : fallbackPermission;
  const permissionError =
    permissionKey && permissionState.key === permissionKey ? permissionState.error : null;
  const permissionLoading = Boolean(permissionKey) && !permission && !permissionError;

  useEffect(() => {
    let cancelled = false;

    if (!workspaceId || !documentId || !permissionKey) return () => { cancelled = true; };

    api
      .get<DocumentPermissionResponse>(`/api/documents/${workspaceId}/${documentId}`)
      .then((data) => {
        if (cancelled) return;
        setPermissionState({
          key: permissionKey,
          permission: {
            access: data.document.access,
            canEdit: data.permissions.can_edit,
            isCreator: data.permissions.is_creator,
          },
          error: null,
        });
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setPermissionState({
          key: permissionKey,
          permission: null,
          error: error.message || "Failed to load document permissions",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, documentId, permissionKey]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    // const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:5000/collaboration";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL
      ? `${process.env.NEXT_PUBLIC_SOCKET_URL}/collaboration`
      : `${protocol}//${window.location.host}/collaboration`;
    const newProvider = new HocuspocusProvider({
      url: SOCKET_URL,
      name: roomName,
      document: ydoc,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      ydoc.destroy();
    };
  }, [roomName]);

  const canEdit = useMemo(() => {
    if (permissionLoading) return false;
    if (permissionError) return false;
    if (!permissionKey) return true;
    return permission?.canEdit ?? false;
  }, [permissionLoading, permissionError, permissionKey, permission?.canEdit]);

  useEffect(() => {
    if (!provider || permissionLoading || canEdit) return;
    const awareness = provider.awareness;
    if (!awareness) return;
    awareness.setLocalState(null);
  }, [provider, permissionLoading, canEdit]);

  useEffect(() => {
    if (!provider || !canEdit) return;
    const awareness = provider.awareness;
    if (awareness && awareness.getLocalState() === null) {
      awareness.setLocalState({});
    }
    provider.setAwarenessField("user", {
      name: user?.name || "Anonymous",
      email: user?.email || "",
      color: cursorColor,
    });
  }, [provider, canEdit, user?.name, user?.email, cursorColor]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          heading: { levels: [1, 2, 3] },
          bulletList: { keepMarks: true, keepAttributes: false },
          orderedList: { keepMarks: true, keepAttributes: false },
        }),
        ...(provider
          ? [
              Collaboration.configure({
                document: provider.document,
              }),
              ...(canEdit
                ? [
                    CollaborationCaret.configure({
                      provider,
                      user: {
                        name: user?.name || "Anonymous",
                        email: user?.email || "",
                        color: cursorColor,
                      },
                      render: (cursorUser: { name?: string; email?: string; color?: string }) => {
                        const safeColor = cursorUser.color || "#3B82F6";
                        const safeName = cursorUser.name || "Anonymous";
                        const safeEmail = cursorUser.email || "";

                        const cursor = document.createElement("span");
                        cursor.classList.add("collab-cursor");
                        cursor.setAttribute("style", `border-color: ${safeColor}`);

                        const label = document.createElement("span");
                        label.classList.add("collab-cursor-label");
                        label.setAttribute("contenteditable", "false");
                        label.setAttribute("style", `background-color: ${safeColor}`);

                        const nameEl = document.createElement("span");
                        nameEl.classList.add("collab-cursor-name");
                        nameEl.textContent = safeName;
                        label.appendChild(nameEl);

                        if (safeEmail) {
                          const emailEl = document.createElement("span");
                          emailEl.classList.add("collab-cursor-email");
                          emailEl.textContent = safeEmail;
                          label.appendChild(emailEl);
                        }

                        cursor.appendChild(label);
                        return cursor;
                      },
                    }),
                  ]
                : []),
            ]
          : []),
      ],
      immediatelyRender: false,
      content: "",
      editorProps: {
        attributes: {
          class: "tiptap-content",
        },
      },
      editable: status === "connected" && canEdit,
    },
    [provider, status, canEdit, user?.name, user?.email, cursorColor]
  );

  useEffect(() => {
    if (!editor || !provider || !canEdit || !user?.name || !editor.commands.updateUser) return;
    editor.commands.updateUser({
      name: user.name,
      email: user.email || "",
      color: cursorColor,
    });
  }, [editor, provider, canEdit, user?.name, user?.email, cursorColor]);

  if (permissionLoading || !editor || !provider) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary">edit_document</span>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading editor...</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-6 py-6 ${
        canEdit ? "" : "viewer-no-cursors"
      }`}
    >
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              description
            </span>
          </div>
          <h2 className="text-lg font-headline font-bold text-on-surface">Document Editor</h2>
        </div>

        <div className="flex items-center gap-2">
          {!canEdit && (
            <div className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container-high text-on-surface-variant">
              View Only
            </div>
          )}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              status === "connected"
                ? "bg-secondary-container/30 text-secondary"
                : status === "connecting"
                ? "bg-tertiary-container/30 text-tertiary"
                : "bg-error-container/30 text-error"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === "connected"
                  ? "bg-secondary animate-pulse"
                  : status === "connecting"
                  ? "bg-tertiary animate-pulse"
                  : "bg-error"
              }`}
            />
            {status === "connected" ? "Synced" : status === "connecting" ? "Connecting..." : "Offline"}
          </div>
        </div>
      </div>

      {permissionError && (
        <div className="mb-3 rounded-lg border border-error/20 bg-error-container/20 px-3 py-2 text-xs text-error">
          {permissionError}
        </div>
      )}

      {canEdit ? (
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl mb-3 shrink-0 flex-wrap shadow-sm">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold"
          >
            <Bold size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic"
          >
            <Italic size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            title="Inline Code"
          >
            <Code size={16} />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={16} />
          </ToolbarBtn>

          <Divider />

          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            title="Blockquote"
          >
            <Quote size={16} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            title="Horizontal Rule"
          >
            <Minus size={16} />
          </ToolbarBtn>
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-outline-variant/15 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
          This document is read-only for you. Only the creator can edit this document.
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
        <EditorContent editor={editor} className="tiptap-editor-wrapper" />
      </div>

      <style jsx global>{`
        .viewer-no-cursors .collab-cursor,
        .viewer-no-cursors .collab-cursor-label {
          display: none !important;
        }

        .collab-cursor {
          border-left: 2px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collab-cursor-label {
          position: absolute;
          top: -1.6em;
          left: -1px;
          display: flex;
          flex-direction: column;
          padding: 2px 6px;
          border-radius: 6px 6px 6px 0;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          line-height: 1.2;
          z-index: 50;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        }

        .collab-cursor-name {
          font-size: 10px;
          font-weight: 700;
          color: white;
          letter-spacing: 0.01em;
        }

        .collab-cursor-email {
          font-size: 8px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
          letter-spacing: 0.01em;
        }

        .tiptap-editor-wrapper .tiptap {
          min-height: 500px;
          padding: 2rem 2.5rem;
          outline: none;
          font-size: 15px;
          line-height: 1.7;
        }

        .tiptap-editor-wrapper .tiptap > * + * {
          margin-top: 0.5em;
        }

        .tiptap-editor-wrapper .tiptap p {
          margin-bottom: 0.25em;
        }

        .tiptap-editor-wrapper .tiptap p.is-editor-empty:first-child::before {
          content: "Start typing...";
          float: left;
          height: 0;
          pointer-events: none;
          color: var(--color-outline, #888);
          opacity: 0.5;
        }

        .tiptap-editor-wrapper .tiptap h1 {
          font-size: 2rem;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          letter-spacing: -0.02em;
        }

        .tiptap-editor-wrapper .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 1.25em;
          margin-bottom: 0.4em;
          letter-spacing: -0.01em;
        }

        .tiptap-editor-wrapper .tiptap h3 {
          font-size: 1.2rem;
          font-weight: 700;
          line-height: 1.35;
          margin-top: 1em;
          margin-bottom: 0.35em;
        }

        .tiptap-editor-wrapper .tiptap ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }

        .tiptap-editor-wrapper .tiptap ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 0.5em;
        }

        .tiptap-editor-wrapper .tiptap li {
          margin-bottom: 0.15em;
        }

        .tiptap-editor-wrapper .tiptap li > p {
          margin-bottom: 0;
        }

        .tiptap-editor-wrapper .tiptap li > ul,
        .tiptap-editor-wrapper .tiptap li > ol {
          margin-top: 0.15em;
        }

        .tiptap-editor-wrapper .tiptap li h1,
        .tiptap-editor-wrapper .tiptap li h2,
        .tiptap-editor-wrapper .tiptap li h3 {
          margin-top: 0.25em;
          margin-bottom: 0.15em;
        }

        .tiptap-editor-wrapper .tiptap blockquote {
          border-left: 3px solid var(--color-outline-variant, #ccc);
          padding-left: 1em;
          margin-left: 0;
          margin-bottom: 0.5em;
          font-style: italic;
          opacity: 0.9;
        }

        .tiptap-editor-wrapper .tiptap code {
          background: var(--color-surface-container-high, #f0f0f0);
          border-radius: 4px;
          padding: 0.15em 0.35em;
          font-size: 0.9em;
          font-family: "JetBrains Mono", "Fira Code", monospace;
        }

        .tiptap-editor-wrapper .tiptap pre {
          background: #1e1e2e;
          color: #cdd6f4;
          padding: 1em 1.25em;
          border-radius: 0.75em;
          font-family: "JetBrains Mono", "Fira Code", monospace;
          font-size: 0.85em;
          overflow-x: auto;
          margin-bottom: 0.75em;
        }

        .tiptap-editor-wrapper .tiptap pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }

        .tiptap-editor-wrapper .tiptap hr {
          border: none;
          border-top: 1px solid var(--color-outline-variant, #ddd);
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active: boolean;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 ${
        active
          ? "bg-primary/10 text-primary shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-outline-variant/20 mx-1.5" />;
}

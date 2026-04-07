"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useAuthStore } from "@/stores/authStore";
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
  Undo2,
  Redo2,
} from "lucide-react";

const CURSOR_COLORS = [
  "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444",
  "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];
const getRandomColor = () => CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

interface TiptapEditorProps {
  roomName: string;
  documentId?: string;
}

export default function TiptapEditor({ roomName, documentId }: TiptapEditorProps) {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<string>("connecting");
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:5000/collaboration";

    const newProvider = new HocuspocusProvider({
      url: SOCKET_URL,
      name: roomName,
      document: ydoc,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      ydoc.destroy();
    };
  }, [roomName]);

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
              CollaborationCaret.configure({
                provider: provider,
                user: {
                  name: user?.name || "Anonymous",
                  email: user?.email || "",
                  color: getRandomColor(),
                },
                render: (cursorUser: { name: string; email: string; color: string }) => {
                  const cursor = document.createElement("span");
                  cursor.classList.add("collab-cursor");
                  cursor.setAttribute("style", `border-color: ${cursorUser.color}`);

                  const label = document.createElement("span");
                  label.classList.add("collab-cursor-label");
                  label.setAttribute("contenteditable", "false");
                  label.setAttribute("style", `background-color: ${cursorUser.color}`);

                  const nameEl = document.createElement("span");
                  nameEl.classList.add("collab-cursor-name");
                  nameEl.textContent = cursorUser.name;

                  label.appendChild(nameEl);

                  if (cursorUser.email) {
                    const emailEl = document.createElement("span");
                    emailEl.classList.add("collab-cursor-email");
                    emailEl.textContent = cursorUser.email;
                    label.appendChild(emailEl);
                  }

                  cursor.appendChild(label);
                  return cursor;
                },
              }),
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
      editable: status === "connected",
    },
    [provider, status]
  );

  // Sync user info to collaboration cursor whenever auth state updates
  useEffect(() => {
    if (editor && provider && user?.name && editor.commands.updateUser) {
      editor.commands.updateUser({
        name: user.name,
        email: user.email || "",
      });
    }
  }, [editor, provider, user?.name, user?.email]);

  if (!editor || !provider) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary">edit_document</span>
        </div>
        <p className="text-sm text-on-surface-variant font-medium">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto px-6 py-6">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              description
            </span>
          </div>
          <h2 className="text-lg font-headline font-bold text-on-surface">Document Editor</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            status === "connected"
              ? "bg-secondary-container/30 text-secondary"
              : status === "connecting"
              ? "bg-tertiary-container/30 text-tertiary"
              : "bg-error-container/30 text-error"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              status === "connected" ? "bg-secondary animate-pulse" : status === "connecting" ? "bg-tertiary animate-pulse" : "bg-error"
            }`} />
            {status === "connected" ? "Synced" : status === "connecting" ? "Connecting…" : "Offline"}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-surface-container-lowest border border-outline-variant/15 rounded-xl mb-3 shrink-0 flex-wrap shadow-sm">

        {/* Text formatting */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline Code">
          <Code size={16} />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
          <Heading3 size={16} />
        </ToolbarBtn>

        <Divider />

        {/* Lists & Blocks */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
          <List size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered List">
          <ListOrdered size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote size={16} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal Rule">
          <Minus size={16} />
        </ToolbarBtn>
      </div>

      {/* ── Editor Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm">
        <EditorContent editor={editor} className="tiptap-editor-wrapper" />
      </div>

      {/* ── Collaboration cursor + editor styles ── */}
      <style jsx global>{`
        /* ── Cursor styles ── */
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
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
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
          color: rgba(255,255,255,0.8);
          letter-spacing: 0.01em;
        }

        /* ── Editor Content Styles ── */
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

        /* Paragraphs */
        .tiptap-editor-wrapper .tiptap p {
          margin-bottom: 0.25em;
        }

        .tiptap-editor-wrapper .tiptap p.is-editor-empty:first-child::before {
          content: "Start typing…";
          float: left;
          height: 0;
          pointer-events: none;
          color: var(--color-outline, #888);
          opacity: 0.5;
        }

        /* Headings */
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

        /* Lists */
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

        /* Fix: headings inside list items */
        .tiptap-editor-wrapper .tiptap li h1,
        .tiptap-editor-wrapper .tiptap li h2,
        .tiptap-editor-wrapper .tiptap li h3 {
          margin-top: 0.25em;
          margin-bottom: 0.15em;
        }

        /* Blockquote */
        .tiptap-editor-wrapper .tiptap blockquote {
          border-left: 3px solid var(--color-outline-variant, #ccc);
          padding-left: 1em;
          margin-left: 0;
          margin-bottom: 0.5em;
          font-style: italic;
          opacity: 0.9;
        }

        /* Code */
        .tiptap-editor-wrapper .tiptap code {
          background: var(--color-surface-container-high, #f0f0f0);
          border-radius: 4px;
          padding: 0.15em 0.35em;
          font-size: 0.9em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .tiptap-editor-wrapper .tiptap pre {
          background: #1e1e2e;
          color: #cdd6f4;
          padding: 1em 1.25em;
          border-radius: 0.75em;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
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

        /* Horizontal Rule */
        .tiptap-editor-wrapper .tiptap hr {
          border: none;
          border-top: 1px solid var(--color-outline-variant, #ddd);
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function ToolbarBtn({ onClick, active, children, title }: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
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

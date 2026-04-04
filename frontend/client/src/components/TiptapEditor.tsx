"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";

const colors = ["#958DF1", "#F98181", "#FBCE76", "#EA838C", "#B5EAEA", "#AEC6CF"];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];
const getRandomName = () => `User ${Math.floor(Math.random() * 1000)}`;

export default function TiptapEditor() {
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<string>("connecting");

  useEffect(() => {
    // 1. Create a new Yjs document
    const ydoc = new Y.Doc();
    
    // We assume backend is running on 5000 in dev
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "ws://localhost:5000/collaboration";

    // 2. Initialize the Hocuspocus provider
    const newProvider = new HocuspocusProvider({
      url: SOCKET_URL,
      name: "test-room", // Hardcoded for testing in two tabs
      document: ydoc,
      onConnect: () => setStatus("connected"),
      onDisconnect: () => setStatus("disconnected"),
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
      ydoc.destroy();
    };
  }, []);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false, // History is handled by Yjs
        }),
        ...(provider
          ? [
              Collaboration.configure({
                document: provider.document,
              }),
              CollaborationCaret.configure({
                provider: provider,
                user: {
                  name: getRandomName(),
                  color: getRandomColor(),
                },
              }),
            ]
          : []),
      ],
      immediatelyRender:false,
      content: "",
      editorProps: {
        attributes: {
          class: "focus:outline-none min-h-[400px] p-6 w-full text-slate-900 dark:text-slate-100 [&>p]:mb-2 [&>h1]:text-4xl [&>h1]:font-extrabold [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-4 [&_li>p]:mb-0 [&>pre]:bg-slate-800 [&>pre]:text-slate-100 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:font-mono [&>pre]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-slate-300 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:mb-4",
        },
      },
      editable: status === "connected",
    },
    [provider, status] // Reinitialize editor when the provider is ready or status changes
  );

  if (!editor || !provider) {
    return <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md animate-pulse">Initializing Editor...</div>;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
  }: {
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={`p-2 transition-colors rounded-md ${
        isActive 
          ? "bg-slate-200 text-slate-900 font-bold dark:bg-slate-700 dark:text-white" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col w-full mx-auto rounded-md shadow-sm mt-4 relative">
      <div className="flex flex-col mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Collaborative Canvas (Test Room)</h2>
        <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            ></span>
            <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">
               {status === "connected" ? "Synced" : "Offline"}
            </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-t-md flex-wrap sticky top-0 z-10 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
        >
          <Strikethrough size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
        >
          <Code size={18} />
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 size={18} />
        </ToolbarButton>
        
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-2" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered size={18} />
        </ToolbarButton>
      </div>

      {/* Editor Main Content */}
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-t-0 rounded-b-md shadow-sm">
        <EditorContent editor={editor} className="[&_.collaboration-cursor\_\_caret]:border-l-[2px] [&_.collaboration-cursor\_\_caret]:border-black [&_.collaboration-cursor\_\_caret]:dark:border-white [&_.collaboration-cursor\_\_caret]:ml-[-1px] [&_.collaboration-cursor\_\_caret]:mr-[-1px] [&_.collaboration-cursor\_\_caret]:pointer-events-none [&_.collaboration-cursor\_\_caret]:relative [&_.collaboration-cursor\_\_caret]:word-break-normal [&_.collaboration-cursor\_\_label]:absolute [&_.collaboration-cursor\_\_label]:top-[-1.4em] [&_.collaboration-cursor\_\_label]:left-[-1px] [&_.collaboration-cursor\_\_label]:bg-black [&_.collaboration-cursor\_\_label]:text-white [&_.collaboration-cursor\_\_label]:px-1 [&_.collaboration-cursor\_\_label]:text-[12px] [&_.collaboration-cursor\_\_label]:leading-normal [&_.collaboration-cursor\_\_label]:font-normal [&_.collaboration-cursor\_\_label]:rounded-sm [&_.collaboration-cursor\_\_label]:whitespace-nowrap [&_.collaboration-cursor\_\_label]:rounded-tl-none"/>
      </div>
    </div>
  );
}

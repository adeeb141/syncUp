import TiptapEditor from "@/components/TiptapEditor";

export default function RequirePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 shadow-xl rounded-xl p-8 border border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Editor Sandbox</h1>
        <p className="text-slate-500 mb-8 max-w-2xl leading-relaxed">
          This page integrates the collaborative Tiptap editor powered by Yjs and Hocuspocus. Open this URL in multiple tabs or windows to see real-time cursor awareness and document synchronization over WebSockets.
        </p>
        <TiptapEditor roomName="test-room" />
      </div>
    </div>
  );
}

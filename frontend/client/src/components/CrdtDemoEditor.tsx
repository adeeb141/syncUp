"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { CrdtDocClient } from "@/crdt/crdtDocClient";
import { api } from "@/lib/api";

interface Props {
  workspaceId: string;
  docId: string;
}

export default function CrdtDemoEditor({ workspaceId, docId }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const [historySeq, setHistorySeq] = useState("");
  const [historyText, setHistoryText] = useState<string | null>(null);
  const clientRef = useRef<CrdtDocClient | null>(null);
  const siteIdRef = useRef<string>("");

  useEffect(() => {
    // A fresh, unique site id every mount. It does NOT need to be stable across
    // reloads/remounts — it only needs to be unique at creation time. Reusing a
    // cached id (e.g. via sessionStorage) while the RGA's clock resets to 0 on
    // every mount causes (site, clock) collisions: React StrictMode alone
    // double-mounts every component once in dev, which was silently dropping
    // ops via the ON CONFLICT DO NOTHING/DO UPDATE path in appendOp.
    const siteId = crypto.randomUUID();
    siteIdRef.current = siteId;

    const client = new CrdtDocClient(
      docId,
      workspaceId,
      siteId,
      (newText) => setText(newText),
      (isOnline) => setOnline(isOnline)
    );
    clientRef.current = client;

    client.open().then((initialText) => {
      setText(initialText);
      setLoading(false);
    });

    return () => client.destroy();
  }, [docId, workspaceId]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText); // instant local feedback
    clientRef.current?.applyTextChange(newText);
  };

  const toggleOffline = async () => {
    if (!simulatedOffline) {
      clientRef.current?.simulateGoOffline();
      setSimulatedOffline(true);
    } else {
      await clientRef.current?.simulateReconnect();
      setSimulatedOffline(false);
    }
  };

  const viewHistory = async () => {
    const seq = Number(historySeq);
    if (!Number.isFinite(seq)) return;
    const res = await api.get<{ text: string }>(`/api/crdt-docs/${docId}/history?atSeq=${seq}`);
    setHistoryText(res.text);
  };

  const revertToHistory = async () => {
    const seq = Number(historySeq);
    if (!Number.isFinite(seq)) return;
    await api.post(`/api/crdt-docs/${docId}/revert`, { workspaceId, targetSeq: seq });
    setHistoryText(null);
  };

  if (loading) {
    return <div className="p-6 text-sm text-on-surface-variant">Loading CRDT demo document...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-on-surface">Custom CRDT Demo (plain text)</h2>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              simulatedOffline
                ? "bg-error-container/30 text-error"
                : online
                ? "bg-secondary-container/40 text-secondary"
                : "bg-tertiary-container/40 text-tertiary"
            }`}
          >
            {simulatedOffline ? "Simulated Offline" : online ? "Synced" : "Connecting..."}
          </span>
          <button
            onClick={toggleOffline}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high hover:bg-surface-container-highest"
          >
            {simulatedOffline ? "Reconnect" : "Simulate Offline"}
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={handleChange}
        rows={16}
        className="w-full rounded-xl border border-outline-variant/20 p-4 font-mono text-sm bg-surface"
        placeholder="Start typing... open this same URL in a second browser/account to see it sync live."
      />

      <p className="text-xs text-on-surface-variant">
        docId: <code>{docId}</code> &middot; workspaceId: <code>{workspaceId}</code> &middot; your site id: <code>{siteIdRef.current}</code>
      </p>

      <div className="rounded-xl border border-outline-variant/20 p-4 space-y-3">
        <h3 className="text-sm font-bold text-on-surface">History / Revert</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={historySeq}
            onChange={(e) => setHistorySeq(e.target.value)}
            placeholder="seq number"
            className="border rounded-lg px-2 py-1 text-sm w-32"
          />
          <button onClick={viewHistory} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-container-high">
            View at seq
          </button>
          <button
            onClick={revertToHistory}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-error-container/30 text-error"
          >
            Revert to seq
          </button>
        </div>
        {historyText !== null && (
          <div className="p-3 rounded-lg bg-surface-container-low text-sm font-mono whitespace-pre-wrap">
            {historyText}
          </div>
        )}
      </div>
    </div>
  );
}
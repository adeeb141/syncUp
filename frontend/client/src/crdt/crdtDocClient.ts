/**
 * Frontend CRDT client. Wires the pure RGA class (identical to the backend
 * copy) into your existing WebSocket connection and REST API.
 *
 * It does NOT open its own WebSocket — it reuses the one SocketProvider
 * already owns, via getSocket() to send, and the "syncup:ws-message" /
 * "syncup:ws-open" / "syncup:ws-close" window events to receive.
 */

import { RGA } from "./rga";
import { Op } from "./types";
import { getSocket } from "@/lib/wsConnection";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

interface CrdtOpMessage {
  type: "CRDT_OP";
  category: string;
  docId: string;
  op: Op;
  seq: number;
}

/** Same diff algorithm as the backend's history.ts — turns "old text -> new text" into insert/delete ops. */
function diffToEdits(from: string, to: string): Array<{ type: "insert" | "delete"; index: number; value?: string }> {
  const n = from.length, m = to.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = from[i] === to[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const edits: Array<{ type: "insert" | "delete"; index: number; value?: string }> = [];
  let i = 0, j = 0, cursor = 0;
  while (i < n && j < m) {
    if (from[i] === to[j]) { i++; j++; cursor++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { edits.push({ type: "delete", index: cursor }); i++; }
    else { edits.push({ type: "insert", index: cursor, value: to[j] }); j++; cursor++; }
  }
  while (i < n) { edits.push({ type: "delete", index: cursor }); i++; }
  while (j < m) { edits.push({ type: "insert", index: cursor, value: to[j] }); cursor++; j++; }
  return edits;
}

export class CrdtDocClient {
  private rga: RGA;
  private latestSeq = 0;
  private pendingQueue: Op[] = [];
  private simulatedOffline = false;

  private onMessageHandler: (e: Event) => void;
  private onOpenHandler: () => void;
  private onCloseHandler: () => void;

  constructor(
    private docId: string,
    private workspaceId: string,
    siteId: string,
    private onChange: (text: string) => void,
    private onStatusChange?: (online: boolean) => void
  ) {
    this.rga = new RGA(siteId);

    this.onMessageHandler = (e: Event) => {
      if (this.simulatedOffline) return; // truly offline: don't let remote updates touch local state
      const detail = (e as CustomEvent).detail as CrdtOpMessage;
      if (detail?.type !== "CRDT_OP" || detail.docId !== this.docId) return;
      this.rga.applyRemote(detail.op); // idempotent — safe even for our own echoed ops
      if (detail.seq > this.latestSeq) this.latestSeq = detail.seq;
      this.onChange(this.rga.materialize());
    };

    this.onOpenHandler = () => {
      if (this.simulatedOffline) return;
      void this.pullMissedOpsAndFlushQueue();
    };

    this.onCloseHandler = () => {
      this.onStatusChange?.(false);
    };

    window.addEventListener("syncup:ws-message", this.onMessageHandler);
    window.addEventListener("syncup:ws-open", this.onOpenHandler);
    window.addEventListener("syncup:ws-close", this.onCloseHandler);
  }

  /** Call once when the component mounts. */
  async open(): Promise<string> {
    const res = await fetch(`${API_BASE}/api/crdt-docs/${this.docId}/ops?since=0`, { credentials: "include" });
    const { ops, latestSeq } = (await res.json()) as { ops: Op[]; latestSeq: number };
    for (const op of ops) this.rga.applyRemote(op);
    this.latestSeq = latestSeq;
    this.onStatusChange?.(true);
    return this.rga.materialize();
  }

  /** Feed a full new text value (e.g. from a <textarea> onChange) — diffs against current state and sends the edits. */
  applyTextChange(newText: string): void {
    const oldText = this.rga.materialize();
    const edits = diffToEdits(oldText, newText);
    for (const edit of edits) {
      const op = edit.type === "insert" ? this.rga.insertLocal(edit.index, edit.value!) : this.rga.deleteLocal(edit.index);
      this.dispatch(op);
    }
  }

  private dispatch(op: Op): void {
    const socket = getSocket();
    if (!this.simulatedOffline && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CRDT_OP", workspaceId: this.workspaceId, docId: this.docId, op }));
    } else {
      this.pendingQueue.push(op);
    }
  }

  /** Manual "go offline" toggle — for demoing requirement #3/#7 without unplugging real network. */
  simulateGoOffline(): void {
    this.simulatedOffline = true;
    this.onStatusChange?.(false);
  }

  async simulateReconnect(): Promise<void> {
    this.simulatedOffline = false;
    await this.pullMissedOpsAndFlushQueue();
  }

  private async pullMissedOpsAndFlushQueue(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/crdt-docs/${this.docId}/ops?since=${this.latestSeq}`, {
      credentials: "include",
    });
    const { ops, latestSeq } = (await res.json()) as { ops: Op[]; latestSeq: number };
    for (const op of ops) this.rga.applyRemote(op);
    this.latestSeq = Math.max(this.latestSeq, latestSeq);
    this.onChange(this.rga.materialize());
    this.onStatusChange?.(true);

    const queued = this.pendingQueue;
    this.pendingQueue = [];
    for (const op of queued) this.dispatch(op);
  }

  getText(): string {
    return this.rga.materialize();
  }

  /** Call on component unmount. */
  destroy(): void {
    window.removeEventListener("syncup:ws-message", this.onMessageHandler);
    window.removeEventListener("syncup:ws-open", this.onOpenHandler);
    window.removeEventListener("syncup:ws-close", this.onCloseHandler);
  }
}
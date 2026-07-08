/**
 * ============================================================================
 * STEP 5 (part 2) — HANDLING AN INCOMING OP
 * ============================================================================
 * This is what your existing plain WebSocket connection calls when a client
 * sends a message shaped like:
 *   { type: "CRDT_OP", workspaceId, docId, op: { ... } }
 *
 * Order matters here: we write the op to Postgres FIRST, then broadcast.
 * If we broadcast first and the DB write fails, other clients would see an
 * edit that a reconnecting client (replaying from the log) would never see —
 * a silent divergence. Writing first means the log is always the source of
 * truth, and broadcast is just "hey, go check" for people already online.
 */

import { appendOp } from "./ops-repository";
import { emitCrdtOp } from "./emitter";
import { Op } from "./types";

interface IncomingCrdtOpMessage {
  type: "CRDT_OP";
  workspaceId: string;
  docId: string;
  op: Op;
}

export async function handleCrdtOpMessage(message: IncomingCrdtOpMessage): Promise<void> {
  const { workspaceId, docId, op } = message;
  if (!workspaceId || !docId || !op) {
    console.error("Malformed CRDT_OP message:", message);
    return;
  }

  const seq = await appendOp(docId, op);
  await emitCrdtOp(workspaceId, docId, op, seq);
}
/**
 * ============================================================================
 * STEP 5 (part 1) — BROADCASTING A CRDT OP
 * ============================================================================
 * Deliberately thin. It doesn't touch Redis directly — it reuses
 * `broadcastToWorkspace` from your existing socket/emitter.ts, which already
 * knows how to fan a message out to every online member of a workspace via
 * Redis pub/sub. We're just giving it a new payload shape: a single CRDT op.
 *
 * Note this broadcasts to the whole WORKSPACE, same as your existing
 * `emitDocumentCreated` etc. — the frontend is responsible for ignoring ops
 * for documents it doesn't currently have open, exactly like it already does
 * for other sync events. If you later want to scope this to just the users
 * with a specific document open, that's a refinement on top of this, not a
 * different design.
 */

import { broadcastToWorkspace } from "../socket/emitter";
import { Op } from "./types";

export async function emitCrdtOp(workspaceId: string, docId: string, op: Op, seq: number): Promise<void> {
  await broadcastToWorkspace(workspaceId, {
    type: "CRDT_OP",
    category: "sync",
    docId,
    op,
    seq,
  });
}
/**
 * STEP 6 (part 2) — SERVER: HISTORY + REVERT
 *
 * History: the op log is append-only, so "the document at time/seq T" is
 * just "replay every op with seq <= T into a fresh RGA."
 *
 * Revert: we do NOT rewrite or delete old ops (that would break convergence
 * for anyone who already saw them). Instead, revert is just a NEW edit —
 * like `git revert` adds a new commit instead of erasing history. We diff
 * the current text against the old text, then apply that diff as ordinary
 * inserts/deletes on the live document, which get appended + broadcast
 * through the exact same pipeline as any other edit.
 */

import { RGA } from "./rga";
import { Op } from "./types";
import { appendOp } from "./ops-repository";
import { emitCrdtOp } from "./emitter";
import { pool } from "../config/DB_connect";

/** Reconstructs the document text as it existed at a given seq (inclusive). */
export async function materializeAt(docId: string, atSeq: number): Promise<string> {
  const { rows } = await pool.query(
    `SELECT seq, op_type, id_site, id_clock, value, origin_site, origin_clock
     FROM crdt_ops WHERE doc_id = $1 AND seq <= $2 ORDER BY seq ASC`,
    [docId, atSeq]
  );
  const rga = new RGA("history-replay");
  for (const row of rows) {
    const op: Op =
      row.op_type === "insert"
        ? {
            type: "insert",
            id: { site: row.id_site, clock: row.id_clock },
            value: row.value,
            originLeft: row.origin_site ? { site: row.origin_site, clock: row.origin_clock } : null,
          }
        : { type: "delete", id: { site: row.id_site, clock: row.id_clock } };
    rga.applyRemote(op);
  }
  return rga.materialize();
}

/** Minimal edit script (indices into `from`/`to`) turning `from` into `to`. Simple O(n*m) LCS — fine for typical doc sizes. */
function diffToEdits(from: string, to: string): Array<{ type: "insert" | "delete"; index: number; value?: string }> {
  const n = from.length, m = to.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = from[i] === to[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const edits: Array<{ type: "insert" | "delete"; index: number; value?: string }> = [];
  let i = 0, j = 0, cursor = 0; // cursor = position in the string as we apply edits left-to-right
  while (i < n && j < m) {
    if (from[i] === to[j]) { i++; j++; cursor++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { edits.push({ type: "delete", index: cursor }); i++; }
    else { edits.push({ type: "insert", index: cursor, value: to[j] }); j++; cursor++; }
  }
  while (i < n) { edits.push({ type: "delete", index: cursor }); i++; }
  while (j < m) { edits.push({ type: "insert", index: cursor, value: to[j] }); cursor++; j++; }
  return edits;
}

/**
 * Reverts a document to how it looked at `targetSeq`, expressed as new ops.
 * Loads the FULL current log into a live RGA, diffs current text against the
 * target snapshot, applies the diff as ordinary local edits (fresh ids,
 * anchored to whatever currently surrounds them), then persists + broadcasts
 * each resulting op through the normal pipeline.
 */
export async function revertDocument(
  docId: string,
  workspaceId: string,
  targetSeq: number,
  actingSiteId: string
): Promise<string> {
  const { rows } = await pool.query(
    `SELECT seq, op_type, id_site, id_clock, value, origin_site, origin_clock
     FROM crdt_ops WHERE doc_id = $1 ORDER BY seq ASC`,
    [docId]
  );
  const live = new RGA(actingSiteId);
  for (const row of rows) {
    const op: Op =
      row.op_type === "insert"
        ? {
            type: "insert",
            id: { site: row.id_site, clock: row.id_clock },
            value: row.value,
            originLeft: row.origin_site ? { site: row.origin_site, clock: row.origin_clock } : null,
          }
        : { type: "delete", id: { site: row.id_site, clock: row.id_clock } };
    live.applyRemote(op);
  }

  const currentText = live.materialize();
  const targetText = await materializeAt(docId, targetSeq);
  const edits = diffToEdits(currentText, targetText);

  for (const edit of edits) {
    const op = edit.type === "insert" ? live.insertLocal(edit.index, edit.value!) : live.deleteLocal(edit.index);
    const seq = await appendOp(docId, op);
    await emitCrdtOp(workspaceId, docId, op, seq);
  }

  return live.materialize();
}
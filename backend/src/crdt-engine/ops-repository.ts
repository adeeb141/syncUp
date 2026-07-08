/**
 * ============================================================================
 * STEP 4 (continued) — READING AND WRITING THE OP LOG
 * ============================================================================
 * Two jobs only, on purpose:
 *   1. appendOp   — write one op to the log (safe to call twice, won't duplicate)
 *   2. getOpsSince — fetch everything that happened after a point, for a client
 *                    that's catching up (this is what powers reconnect replay
 *                    in step 6, and what powers "load the doc" on first open)
 *
 * NOTE: this file can't be run/tested in this sandbox since there's no live
 * Postgres here — adjust the import path below to your real pool export
 * (it already matches src/config/DB_connect.ts: `export const pool`), then
 * run the schema.sql against your dev database before trying this.
 */

import { pool } from "../config/DB_connect"; // <- adjust path to match where you place this file
import { DeleteOp, InsertOp, Op } from "./types";

export async function appendOp(docId: string, op: Op): Promise<number> {
  // "DO UPDATE SET seq = crdt_ops.seq" is a no-op write that exists purely so
  // RETURNING always gives us a row back, even when the op was already there.
  if (op.type === "insert") {
    const { rows } = await pool.query(
      `INSERT INTO crdt_ops (doc_id, op_type, id_site, id_clock, value, origin_site, origin_clock)
       VALUES ($1, 'insert', $2, $3, $4, $5, $6)
       ON CONFLICT (doc_id, op_type, id_site, id_clock) DO UPDATE SET seq = crdt_ops.seq
       RETURNING seq`,
      [docId, op.id.site, op.id.clock, op.value, op.originLeft?.site ?? null, op.originLeft?.clock ?? null]
    );
    return rows[0].seq;
  }
  const { rows } = await pool.query(
    `INSERT INTO crdt_ops (doc_id, op_type, id_site, id_clock)
     VALUES ($1, 'delete', $2, $3)
     ON CONFLICT (doc_id, op_type, id_site, id_clock) DO UPDATE SET seq = crdt_ops.seq
     RETURNING seq`,
    [docId, op.id.site, op.id.clock]
  );
  return rows[0].seq;
}

export async function getOpsSince(docId: string, afterSeq: number): Promise<{ ops: Op[]; latestSeq: number }> {
  const { rows } = await pool.query(
    `SELECT seq, op_type, id_site, id_clock, value, origin_site, origin_clock
     FROM crdt_ops
     WHERE doc_id = $1 AND seq > $2
     ORDER BY seq ASC`,
    [docId, afterSeq]
  );

  const ops: Op[] = rows.map((row): Op => {
    if (row.op_type === "insert") {
      const insertOp: InsertOp = {
        type: "insert",
        id: { site: row.id_site, clock: row.id_clock },
        value: row.value,
        originLeft: row.origin_site ? { site: row.origin_site, clock: row.origin_clock } : null,
      };
      return insertOp;
    }
    const deleteOp: DeleteOp = { type: "delete", id: { site: row.id_site, clock: row.id_clock } };
    return deleteOp;
  });

  const latestSeq = rows.length > 0 ? rows[rows.length - 1].seq : afterSeq;
  return { ops, latestSeq };
}
/**
 * ============================================================================
 * STEP 1 — THE OP FORMAT
 * ============================================================================
 *
 * This is the design we talked through on paper, written down as types.
 * Everything downstream (the CRDT class, the op log, the network layer)
 * is built on these three shapes. Get these right and the rest follows.
 *
 * WHY THIS SHAPE:
 *
 * - `Identifier` is a Lamport-style (site, clock) pair. `site` is a unique
 *   id per client/replica; `clock` is a per-site counter that only ever
 *   increases. Together they're globally unique AND totally orderable
 *   (compare clock first, then site as a tiebreaker) — which is exactly
 *   what we need for the deterministic tie-break rule when two replicas
 *   insert "at the same spot" concurrently.
 *
 * - `originLeft` on an InsertOp is the id of the character this new
 *   character was inserted immediately after, AT THE TIME OF INSERTION
 *   (from the inserting client's local view). This is the anchor that
 *   lets every replica agree on relative position without needing a
 *   shared absolute index — indices shift constantly as other edits land,
 *   but "I go right after character X" never changes meaning.
 *
 * - Deletes don't remove anything. They mark an existing id as invisible.
 *   This is the tombstone: later inserts may still reference a deleted
 *   character's id as their originLeft, so we can never actually forget it.
 */

export interface Identifier {
  site: string;   // unique per replica/client
  clock: number;  // per-site logical clock, strictly increasing
}

export interface InsertOp {
  type: "insert";
  id: Identifier;             // this character's own unique id
  value: string;               // the character (or token, for structured docs)
  originLeft: Identifier | null; // id of the character it was inserted after (null = start of doc)
}

export interface DeleteOp {
  type: "delete";
  id: Identifier; // the id of the character being tombstoned
}

export type Op = InsertOp | DeleteOp;

/**
 * The internal representation of a single character in the replica's
 * sequence. `visible: false` is the tombstone flag — the character stays
 * in the sequence forever (in this simplified version — a production
 * system would eventually garbage-collect old tombstones), it's just
 * excluded when materializing the visible text.
 */
export interface CRDTChar {
  id: Identifier;
  value: string;
  visible: boolean;
  originLeft: Identifier | null;
}
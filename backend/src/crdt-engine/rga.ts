/**
 * ============================================================================
 * STEP 2 — THE PURE CRDT DATA STRUCTURE
 * ============================================================================
 *
 * An RGA (Replicated Growable Array) for plain text.
 *
 * There is deliberately no network code, no database code, and no I/O
 * anywhere in this file. That's the point — this class should be provable
 * and testable entirely on its own, in memory, which is exactly what makes
 * step 3 (the convergence test) meaningful. If this class is correct, every
 * layer we bolt on afterwards (persistence, broadcast, offline replay) is
 * just plumbing around something we've already proven works.
 *
 * THE CORE ALGORITHM (`integrate`):
 * To insert a new character, find the character it claims to go after
 * (`originLeft`), then scan forward past any OTHER characters that were
 * also inserted at that same spot by a different replica, breaking the
 * tie deterministically by comparing ids. Every replica does this exact
 * same scan with the exact same tie-break rule, so no matter what order
 * operations arrive in, everyone lands on the same final sequence.
 *
 * KNOWN LIMITATION (intentional, and worth stating out loud): this is
 * plain RGA, not Yjs's YATA refinement. If two people type multi-character
 * words concurrently at the exact same spot, the words can interleave
 * character-by-character in a visually odd way (e.g. "hello" + "world" at
 * the same position might not converge to a clean "helloworld" or
 * "worldhello" — it could interleave). Every replica still converges to
 * the IDENTICAL result — that's the convergence guarantee, and it's what
 * the test below proves — it's just not always the most readable outcome.
 * That's a solvable refinement (YATA), not a correctness bug, and it's a
 * great thing to mention as a known trade-off / next iteration.
 */

import { CRDTChar, DeleteOp, Identifier, InsertOp, Op } from "./types";

function idKey(id: Identifier): string {
  return `${id.site}:${id.clock}`;
}

function compareIds(a: Identifier, b: Identifier): number {
  if (a.clock !== b.clock) return a.clock - b.clock;
  return a.site < b.site ? -1 : a.site > b.site ? 1 : 0;
}

export class RGA {
  private readonly site: string;
  private clock = 0;
  private seq: CRDTChar[] = []; // full causal sequence, tombstones included

  // Ops whose dependency (originLeft, for inserts; the target id, for deletes)
  // hasn't been integrated yet. Without this, replaying (or receiving) ops out
  // of causal order would silently misplace them at the start of the document
  // instead of waiting — which is exactly what out-of-order DB writes exposed.
  private pendingOps: Op[] = [];

  constructor(site: string) {
    this.site = site;
  }

  private nextId(): Identifier {
    this.clock += 1;
    return { site: this.site, clock: this.clock };
  }

  private findIndexById(id: Identifier | null): number {
    if (id === null) return -1;
    const key = idKey(id);
    return this.seq.findIndex((c) => idKey(c.id) === key);
  }

  /** Places a character into `seq` at the position every replica will agree on. */
  private integrate(char: CRDTChar): void {
    const leftIndex = this.findIndexById(char.originLeft);
    let i = leftIndex + 1;

    while (i < this.seq.length) {
      const other = this.seq[i];
      const otherLeftIndex = this.findIndexById(other.originLeft);

      if (otherLeftIndex < leftIndex) break;
      if (otherLeftIndex === leftIndex && compareIds(other.id, char.id) < 0) break;

      i += 1;
    }

    this.seq.splice(i, 0, char);
  }

  private visibleChars(): CRDTChar[] {
    return this.seq.filter((c) => c.visible);
  }

  /** True only if this op's dependency is already present, so it's safe to apply now. */
  private canApply(op: Op): boolean {
    if (op.type === "delete") return this.findIndexById(op.id) !== -1;
    return op.originLeft === null || this.findIndexById(op.originLeft) !== -1;
  }

  /** Actually applies one op. Only call this once `canApply` is true. Idempotent. */
  private applyOne(op: Op): void {
    if (op.type === "insert") {
      if (this.findIndexById(op.id) !== -1) return; // already have it
      this.integrate({ id: op.id, value: op.value, visible: true, originLeft: op.originLeft });
    } else {
      const idx = this.findIndexById(op.id);
      if (idx !== -1) this.seq[idx].visible = false;
    }
  }

  /** After any successful apply, re-check the buffer — something else may now be unblocked. */
  private drainPending(): void {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (let i = 0; i < this.pendingOps.length; i++) {
        if (this.canApply(this.pendingOps[i])) {
          const [op] = this.pendingOps.splice(i, 1);
          this.applyOne(op);
          progressed = true;
          break;
        }
      }
    }
  }

  /** Local edit: insert `value` at visible-text position `index`. Returns the op to broadcast. */
  insertLocal(index: number, value: string): InsertOp {
    const visible = this.visibleChars();
    const originLeft = index === 0 ? null : visible[index - 1].id;
    const id = this.nextId();
    const char: CRDTChar = { id, value, visible: true, originLeft };
    this.integrate(char); // local edits always reference an id we already have — never needs buffering
    return { type: "insert", id, value, originLeft };
  }

  /** Local edit: delete the visible character at position `index`. Returns the op to broadcast. */
  deleteLocal(index: number): DeleteOp {
    const visible = this.visibleChars();
    const target = visible[index];
    target.visible = false;
    return { type: "delete", id: target.id };
  }

  /**
   * Apply an op that originated elsewhere (or was replayed from the log).
   * If its dependency hasn't arrived yet, it's buffered instead of applied —
   * this is what makes correctness independent of delivery/replay order, not
   * just "eventually convergent assuming things arrive causally."
   */
  applyRemote(op: Op): void {
    if (this.canApply(op)) {
      this.applyOne(op);
      this.drainPending();
    } else {
      this.pendingOps.push(op);
    }
  }

  /** The current visible document text. */
  materialize(): string {
    return this.visibleChars().map((c) => c.value).join("");
  }
}
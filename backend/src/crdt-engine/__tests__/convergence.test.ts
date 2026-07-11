/**
 * ============================================================================
 * STEP 3 — THE CONVERGENCE PROOF (requirement #6 from your assignment)
 * ============================================================================
 *
 * This is deliberately run BEFORE any network/persistence code exists.
 * If the algorithm itself doesn't converge, no amount of correct plumbing
 * around it will fix that — so we prove this first, in isolation.
 *
 * THE SETUP:
 * Two replicas, "alice" and "bob", both start from the SAME empty document
 * and concurrently type a word each, without having seen each other's edits
 * yet (this is the realistic "two people typing at once" scenario). Alice's
 * ops causally depend only on her own earlier ops; same for Bob. Their two
 * op-chains are causally independent of each other — which is precisely the
 * situation a real-time sync engine has to handle, and precisely what the
 * ordering is free to shuffle when we test convergence.
 *
 * We collect all 10 ops (5 from Alice, 5 from Bob), then feed many different
 * interleavings of them into fresh replicas (keeping each person's OWN ops
 * in their own order — you can't apply someone's 2nd op before their 1st,
 * any more than a network could deliver a reply before the message it's
 * replying to — but Alice's and Bob's ops relative to EACH OTHER can arrive
 * in any order). Every interleaving must produce byte-identical final state.
 *
 * We also run a second scenario that includes a delete, and a third that
 * simulates an "offline" client whose ops arrive as one late batch — to
 * cover requirement #3 (offline edits merge correctly on reconnect).
 */

import { RGA } from "../rga";
import { Op } from "../types";

function randomInterleaving<T>(seqA: T[], seqB: T[]): T[] {
  const result: T[] = [];
  let i = 0, j = 0;
  while (i < seqA.length || j < seqB.length) {
    const takeA = j >= seqB.length || (i < seqA.length && Math.random() < 0.5);
    if (takeA) result.push(seqA[i++]);
    else result.push(seqB[j++]);
  }
  return result;
}

function applyAll(site: string, ops: Op[]): string {
  const r = new RGA(site);
  for (const op of ops) r.applyRemote(op);
  return r.materialize();
}

function scenarioConcurrentInserts() {
  const alice = new RGA("alice");
  const aliceOps: Op[] = [..."Hi!"].map((ch, i) => alice.insertLocal(i, ch));

  const bob = new RGA("bob");
  const bobOps: Op[] = [..."Yo!"].map((ch, i) => bob.insertLocal(i, ch));

  const NUM_TRIALS = 300;
  const results = new Set<string>();
  for (let t = 0; t < NUM_TRIALS; t++) {
    const order = randomInterleaving(aliceOps, bobOps);
    results.add(applyAll(`checker-${t}`, order));
  }

  console.log(`[concurrent inserts] ${results.size} distinct final state(s) across ${NUM_TRIALS} orderings`);
  console.log(`  -> "${[...results][0]}"`);
  if (results.size !== 1) throw new Error("FAILED: replicas diverged across different delivery orders");
}

function scenarioWithDelete() {
  const alice = new RGA("alice");
  const insertOps: Op[] = [..."Hello"].map((ch, i) => alice.insertLocal(i, ch));
  const deleteOp: Op = alice.deleteLocal(0); // delete the 'H'

  const bob = new RGA("bob");
  const bobOps: Op[] = [..."!!"].map((ch, i) => bob.insertLocal(i, ch));

  const aliceAllOps = [...insertOps, deleteOp]; // delete must come after its insert, within Alice's own chain
  const NUM_TRIALS = 300;
  const results = new Set<string>();
  for (let t = 0; t < NUM_TRIALS; t++) {
    const order = randomInterleaving(aliceAllOps, bobOps);
    results.add(applyAll(`checker-${t}`, order));
  }

  console.log(`[insert + delete] ${results.size} distinct final state(s) across ${NUM_TRIALS} orderings`);
  console.log(`  -> "${[...results][0]}"`);
  if (results.size !== 1) throw new Error("FAILED: replicas diverged when a delete was involved");
}

function scenarioOfflineReconnect() {
  // "Online" replica keeps editing while another replica is offline.
  const online = new RGA("online-client");
  const onlineOps: Op[] = [..."synced"].map((ch, i) => online.insertLocal(i, ch));

  // Offline replica composes its own edits locally, disconnected, unaware of `online`'s ops.
  const offline = new RGA("offline-client");
  const offlineOps: Op[] = [..."buffered"].map((ch, i) => offline.insertLocal(i, ch));

  // Reconnect: offline client receives the ops it missed, in order, THEN replays
  // its own buffered ops (the standard "pull missed ops, then push local queue" pattern).
  const reconciled = new RGA("reconciled-offline-client");
  for (const op of onlineOps) reconciled.applyRemote(op);
  for (const op of offlineOps) reconciled.applyRemote(op);

  // A third, fully-online replica receives the exact same two batches in the
  // OPPOSITE order (it heard the offline client's ops arrive first, say via
  // a different path) — must still converge to the same state.
  const other = new RGA("other-online-client");
  for (const op of offlineOps) other.applyRemote(op);
  for (const op of onlineOps) other.applyRemote(op);

  console.log(`[offline reconnect] reconciled: "${reconciled.materialize()}"`);
  console.log(`[offline reconnect] other order: "${other.materialize()}"`);
  if (reconciled.materialize() !== other.materialize()) {
    throw new Error("FAILED: offline replay didn't converge with the differently-ordered replica");
  }
  // Also prove no data was lost or duplicated: every character from both batches should appear exactly once.
  const expectedLength = onlineOps.length + offlineOps.length;
  if (reconciled.materialize().length !== expectedLength) {
    throw new Error("FAILED: character count mismatch — possible loss or duplication");
  }
}

function scenarioFullyScrambledDelivery() {
  // One replica types a full sentence — a strict causal chain (op N depends on op N-1).
  const writer = new RGA("writer");
  const ops: Op[] = [..."to test live\nto test offline"].map((ch, i) => writer.insertLocal(i, ch));
  const expected = writer.materialize();

  const NUM_TRIALS = 200;
  const results = new Set<string>();
  for (let t = 0; t < NUM_TRIALS; t++) {
    // Fully random shuffle — NOT just interleaving two causal chains, actual
    // arbitrary order, same as what out-of-order DB writes produced in practice.
    const shuffled = [...ops];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    results.add(applyAll(`checker-${t}`, shuffled));
  }

  console.log(`[fully scrambled delivery] ${results.size} distinct final state(s) across ${NUM_TRIALS} random orderings`);
  console.log(`  -> "${[...results][0]}"`);
  if (results.size !== 1) throw new Error("FAILED: scrambled delivery order produced different results");
  if ([...results][0] !== expected) throw new Error(`FAILED: converged, but to the WRONG text (expected "${expected}")`);
}

scenarioConcurrentInserts();
scenarioWithDelete();
scenarioOfflineReconnect();
scenarioFullyScrambledDelivery();
console.log("\nAll convergence properties hold. ✅");
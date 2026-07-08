/**
 * ============================================================================
 * MANUAL INTEGRATION TEST — run this against your REAL Neon database
 * ============================================================================
 * This is not part of the app. It's a one-off script to prove that:
 *   1. Ops produced by the RGA class can be written to crdt_ops
 *   2. They can be read back
 *   3. Replaying them into a brand new, empty RGA reproduces the exact
 *      same text the original replica had
 *
 * Run it with:  npx ts-node src/crdt-engine/test-db-integration.ts
 * (adjust the path if you placed crdt-engine/ somewhere else)
 *
 * It uses a randomly generated doc_id each run, so it will NEVER touch or
 * collide with any of your real documents — safe to run as many times as
 * you like. Feel free to delete the rows afterwards with:
 *   DELETE FROM crdt_ops WHERE doc_id = '<the id it prints>';
 */

import { randomUUID } from "crypto";
import { RGA } from "./rga";
import { appendOp, getOpsSince } from "./ops-repository";

async function main() {
  const docId = randomUUID();
  console.log(`Using test doc_id: ${docId}`);

  // 1. Simulate a client typing "Hello!" locally.
  const writer = new RGA("test-client-A");
  const ops = [..."Hello!"].map((ch, i) => writer.insertLocal(i, ch));
  console.log(`Local (in-memory) text: "${writer.materialize()}"`);

  // 2. Persist every op to Postgres, in order.
  for (const op of ops) {
    await appendOp(docId, op);
  }
  console.log("Ops written to crdt_ops.");

  // 3. Read them back from scratch, as if we were a brand new server process.
  const { ops: fetchedOps, latestSeq } = await getOpsSince(docId, 0);
  console.log(`Fetched ${fetchedOps.length} ops back from the database (latestSeq=${latestSeq}).`);

  // 4. Replay into a completely fresh RGA and check it matches.
  const reader = new RGA("test-client-B-replaying");
  for (const op of fetchedOps) reader.applyRemote(op);
  console.log(`Replayed (from DB) text: "${reader.materialize()}"`);

  if (reader.materialize() === writer.materialize()) {
    console.log("\n✅ MATCH — persistence and replay work correctly.");
  } else {
    console.log("\n❌ MISMATCH — something is wrong, do not proceed to step 5 yet.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Integration test failed to run:", err);
  process.exit(1);
});
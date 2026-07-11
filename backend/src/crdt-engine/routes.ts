/**
 * ============================================================================
 * STEP 5 (part 3) — LOADING A DOCUMENT'S HISTORY ON OPEN
 * ============================================================================
 * The WebSocket only carries NEW ops from now on. When a client first opens
 * a document (or reconnects after being offline), it needs everything that
 * already happened. This is that one endpoint — same requireAuth pattern as
 * your other routes.
 *
 * GET /api/crdt-docs/:docId/ops?since=0
 *   -> { ops: Op[], latestSeq: number }
 *
 * The client stores `latestSeq` and passes it back as `since` next time it
 * reconnects, so it only fetches what it missed.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { getOpsSince } from "./ops-repository";
import { materializeAt, revertDocument } from "./history";

const router = Router();

router.get("/:docId/ops", requireAuth, async (req: Request, res: Response) => {
  try {
    // const { docId } = req.params;
    const docId = Array.isArray(req.params.docId)
  ? req.params.docId[0]
  : req.params.docId;
  
    const since = Number(req.query.since ?? 0);

    const { ops, latestSeq } = await getOpsSince(docId, Number.isFinite(since) ? since : 0);
    res.json({ ops, latestSeq });
  } catch (err) {
    console.error("Failed to fetch CRDT ops:", err);
    res.status(500).json({ error: "Failed to load document history" });
  }
});

// GET /api/crdt-docs/:docId/history?atSeq=42  -> view the doc as it looked at that point
router.get("/:docId/history", requireAuth, async (req: Request, res: Response) => {
  try {
    // const { docId } = req.params;
     const docId = Array.isArray(req.params.docId)
  ? req.params.docId[0]
  : req.params.docId;
    const atSeq = Number(req.query.atSeq);
    if (!Number.isFinite(atSeq)) {
      res.status(400).json({ error: "atSeq query param is required" });
      return;
    }
    const text = await materializeAt(docId, atSeq);
    res.json({ text });
  } catch (err) {
    console.error("Failed to materialize document history:", err);
    res.status(500).json({ error: "Failed to load document history" });
  }
});

// POST /api/crdt-docs/:docId/revert  { workspaceId, targetSeq }
router.post("/:docId/revert", requireAuth, async (req: Request, res: Response) => {
  try {
    // const { docId } = req.params;
     const docId = Array.isArray(req.params.docId)
  ? req.params.docId[0]
  : req.params.docId;
    const { workspaceId, targetSeq } = req.body;
    const userId = (req as any).user?.id ?? "unknown-user";

    if (!workspaceId || !Number.isFinite(Number(targetSeq))) {
      res.status(400).json({ error: "workspaceId and targetSeq are required" });
      return;
    }

    const text = await revertDocument(docId, workspaceId, Number(targetSeq), userId);
    res.json({ text });
  } catch (err) {
    console.error("Failed to revert document:", err);
    res.status(500).json({ error: "Failed to revert document" });
  }
});

export default router;
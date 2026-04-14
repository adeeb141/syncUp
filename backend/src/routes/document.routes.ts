import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { createDocument, getDocumentById, getWorkspaceDocuments } from "../controllers/document.controller";

const router = Router();

router.post("/:workspace_id", requireAuth, createDocument);
router.get("/:workspace_id/:document_id", requireAuth, getDocumentById);
router.get("/:workspace_id", requireAuth, getWorkspaceDocuments);

export default router;

import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { createDocument, getWorkspaceDocuments } from "../controllers/document.controller";

const router = Router();

router.post("/:workspace_id", requireAuth, createDocument);
router.get("/:workspace_id", requireAuth, getWorkspaceDocuments);

export default router;

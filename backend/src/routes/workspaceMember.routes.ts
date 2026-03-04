import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { addWorkspaceMember } from "../controllers/workspaceMember.controller";

const router=Router();

router.post("/:workspaceId/members",requireAuth,addWorkspaceMember);

export default router;
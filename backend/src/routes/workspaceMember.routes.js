import express from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { addWorkspaceMember } from "../controllers/workspaceMember.controller.js";
const router=express.Router();

router.post("/:workspaceId/members",requireAuth,addWorkspaceMember);

export default router;
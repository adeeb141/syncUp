import { Router } from "express";
import { addProjectToWorkspace } from "../controllers/projects.controller";
import { requireAuth } from "../middlewares/requireAuth";
const router=Router();

router.post("/:workspace_id/addproject",requireAuth,addProjectToWorkspace);

export default router;
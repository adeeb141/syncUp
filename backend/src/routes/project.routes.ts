import { Router } from "express";
import { addProjectToWorkspace, getProjectTasks, getUserProjects } from "../controllers/projects.controller";
import { requireAuth } from "../middlewares/requireAuth";
const router=Router();

router.post("/:workspace_id/projects", requireAuth, addProjectToWorkspace);
router.get("/:project_id/tasksinfo",requireAuth,getProjectTasks);
router.get("/my-projects", requireAuth, getUserProjects);

export default router;
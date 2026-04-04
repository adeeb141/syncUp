import { Router } from "express";
import { addProjectToWorkspace, getProjectTasks, getUserProjects } from "../controllers/projects.controller";
import { requireAuth } from "../middlewares/requireAuth";
const router=Router();

<<<<<<< HEAD
router.post("/:workspace_id/projects", requireAuth, addProjectToWorkspace);
=======
router.post("/:workspace_id/addproject",requireAuth,addProjectToWorkspace);
>>>>>>> 238f89aebacaa6359b4eb8233c18b79eeda816cc
router.get("/:project_id/tasksinfo",requireAuth,getProjectTasks);
router.get("/my-projects", requireAuth, getUserProjects);

export default router;
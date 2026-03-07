import { Router,Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { addTaskToProject } from "../controllers/tasks.controller";

const router=Router();

router.post("/:project_id/addtask",requireAuth,addTaskToProject);

export default router;
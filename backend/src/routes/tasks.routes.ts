import { Router,Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { addTaskToProject, updateTask, deleteTask, getUserTasks } from "../controllers/tasks.controller";

const router=Router();

router.post("/:project_id/tasks", requireAuth, addTaskToProject);
router.patch("/:task_id",requireAuth,updateTask);
router.delete("/:task_id",requireAuth,deleteTask);

router.get("/my-tasks", requireAuth, getUserTasks);

export default router;
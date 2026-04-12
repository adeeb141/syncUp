import { Router,Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { addTaskToProject, updateTask, deleteTask, getUserTasks, requestTaskReview, handleTaskReview } from "../controllers/tasks.controller";

const router=Router();

router.get("/my-tasks", requireAuth, getUserTasks);

router.post("/:project_id/tasks", requireAuth, addTaskToProject);
router.patch("/:task_id/request-review", requireAuth, requestTaskReview);
router.patch("/:task_id/handle-review", requireAuth, handleTaskReview);
router.patch("/:task_id",requireAuth,updateTask);
router.delete("/:task_id",requireAuth,deleteTask);

export default router;
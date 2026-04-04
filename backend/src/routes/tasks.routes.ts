import { Router,Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { addTaskToProject, updateTask, deleteTask, getUserTasks } from "../controllers/tasks.controller";

const router=Router();

<<<<<<< HEAD
router.post("/:project_id/tasks", requireAuth, addTaskToProject);
router.patch("/:task_id",requireAuth,updateTask);
router.delete("/:task_id",requireAuth,deleteTask);
=======
router.post("/:project_id/addtask",requireAuth,addTaskToProject);
router.patch("/:task_id/update",requireAuth,updateTask);
router.delete("/:task_id/delete",requireAuth,deleteTask);
>>>>>>> 238f89aebacaa6359b4eb8233c18b79eeda816cc

router.get("/my-tasks", requireAuth, getUserTasks);

export default router;
import { requireAuth } from "../middlewares/requireAuth";
import { createWorkspace } from "../controllers/workspace.controller";
import { Router } from "express";


const router=Router();

router.post("/",requireAuth,createWorkspace);

export default router;
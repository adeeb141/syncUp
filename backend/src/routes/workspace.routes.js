import { requireAuth } from "../middlewares/requireAuth.js";
import { createWorkspace } from "../controllers/workspace.controller.js";
import express from "express";

const router=express.Router();

router.post("/",requireAuth,createWorkspace);

export default router;
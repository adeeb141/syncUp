import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { sendInvite } from "../controllers/workspaceInvite.controller";

const router=Router();

router.post("/sendinvite",requireAuth,sendInvite);

export default router;
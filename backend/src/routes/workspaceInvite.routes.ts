import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { sendInvite, acceptInvite, rejectInvite } from "../controllers/workspaceInvite.controller";

const router=Router();

router.post("/sendinvite",requireAuth,sendInvite);
router.post("/accept",requireAuth,acceptInvite);
router.post("/reject",requireAuth,rejectInvite);

export default router;
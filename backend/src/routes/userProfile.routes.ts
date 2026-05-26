import { changePassword } from "../controllers/userProfile.controller";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/changepassword", requireAuth, changePassword);

export default router;
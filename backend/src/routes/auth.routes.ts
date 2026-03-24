import { Router } from "express";
import { signup, login } from "../controllers/auth.controller";
import { getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me",requireAuth,getMe);

export default router;
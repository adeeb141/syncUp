import { Router } from "express";
import { signup, login, logout } from "../controllers/auth.controller";
import { getMe } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me",requireAuth,getMe);

export default router;
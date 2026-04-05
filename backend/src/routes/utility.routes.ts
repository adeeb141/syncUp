import { userNotInWorkspaceSearch } from "../controllers/utility.controller";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
const router=Router();

router.post('/getusers/:workspace_id',requireAuth,userNotInWorkspaceSearch);

export default router;
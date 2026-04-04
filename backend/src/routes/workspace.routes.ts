import { requireAuth } from "../middlewares/requireAuth";
import { createWorkspace,deleteWorkspace,updateWorkspace,getUserWorkspaces,getWorkspaceProjectsAndMembers} from "../controllers/workspace.controller";
import { Router } from "express";


const router=Router();

router.post("/create",requireAuth,createWorkspace);
router.post("/:workspace_id/delete",requireAuth,deleteWorkspace);
router.post("/:workspace_id/update",requireAuth,updateWorkspace);
router.get("/getuserworkspaces",requireAuth,getUserWorkspaces);
router.get('/:workspace_id/getinfo',requireAuth,getWorkspaceProjectsAndMembers);
export default router;
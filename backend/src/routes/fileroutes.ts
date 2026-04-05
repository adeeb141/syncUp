import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { upload } from "../middlewares/upload";
import { uploadFile ,deleteFile,getFiles,getFileUrl} from "../controllers/file.controller";

const router = Router();

router.post("/upload", requireAuth, upload.single("file"), uploadFile);
router.get("/", requireAuth, getFiles);
router.delete("/:file_id", requireAuth, deleteFile);
router.get("/:file_id/url", requireAuth, getFileUrl);
export default router;
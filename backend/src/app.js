import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js"
import cookieParser from "cookie-parser";
import addWorkspaceMemberRoutes from "./routes/workspaceMember.routes.js"
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces",workspaceRoutes);
app.use("/api/workspaces",addWorkspaceMemberRoutes);

export default app;
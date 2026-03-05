import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import cookieParser from "cookie-parser";
import addWorkspaceMemberRoutes from "./routes/workspaceMember.routes";
import addProjectToWorkspaceRoutes from "./routes/addProject.routes";
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces",workspaceRoutes);
app.use("/api/workspaces",addWorkspaceMemberRoutes);
app.use("/api/workspaces",addProjectToWorkspaceRoutes);


export default app;
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import cookieParser from "cookie-parser";
import addWorkspaceMemberRoutes from "./routes/workspaceMember.routes";
import ProjectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/tasks.routes"
import fileRoutes from "./routes/fileroutes"
const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces",workspaceRoutes);
app.use("/api/workspaces",addWorkspaceMemberRoutes);
app.use("/api/workspaces",ProjectRoutes);
app.use("/api/workspaces/projects",taskRoutes);

app.use("/api/files", fileRoutes);
export default app;
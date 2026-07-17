import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import cookieParser from "cookie-parser";
import addWorkspaceMemberRoutes from "./routes/workspaceMember.routes";
import ProjectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/tasks.routes"
import fileRoutes from "./routes/fileroutes"
import utilityRoutes from "./routes/utility.routes";
import inviteRoutes from  "./routes/workspaceInvite.routes";
import documentRoutes from "./routes/document.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import userProfileRoutes from "./routes/userProfile.routes"
import crdtRoutes from "./crdt-engine/routes";
import pushRoutes from "./routes/push.routes";

const app = express();

// app.use(cors({
//   origin: "http://localhost:3000",
//   credentials: true
// }));


app.use(cors({
  origin: process.env.FRONTEND_URL ||"http://localhost:3000",
  credentials: true,
}));


app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces",workspaceRoutes);
app.use("/api/workspaces",addWorkspaceMemberRoutes);
app.use("/api/workspaces",ProjectRoutes);

app.use("/api/files", fileRoutes);
app.use("/api/utility",utilityRoutes);
app.use("/api/invite",inviteRoutes);

app.use("/api/push", pushRoutes);

app.use("/api/projects",taskRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/user",userProfileRoutes);
app.use("/api/crdt-docs", crdtRoutes);
export default app;
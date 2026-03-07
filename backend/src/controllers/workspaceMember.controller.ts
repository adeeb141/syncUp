import { pool } from "../config/DB_connect";
import { Request,Response } from "express";
interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: Date;
}
interface WorkspaceMember{
    workspace_id:string,
    user_id:string,
    role:"owner" | "admin" | "member",
    joined_at:Date
}
interface MemberBody{
  workspace_id:string,
  user_id:string,
  role:"owner" | "admin" | "member"
}
interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_verified:boolean,
  created_at: Date;
}

export const addWorkspaceMember = async (req:Request<{workspaceId:string},{},MemberBody>,res:Response):Promise<Response | void > => {
  try {
    const workspace_id = req.params.workspaceId;
    const { user_id, role } = req.body;
    const requesterId = req.user?.id;

    if (!user_id || !role) {
      return res.status(400).json({
        message: "user_id and role are required",
      });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const workspaceResult = await pool.query<Workspace>(
      "SELECT id, owner_id FROM workspaces WHERE id = $1",
      [workspace_id]
    );

    if (workspaceResult.rowCount === 0) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const workspace = workspaceResult.rows[0];

    const requesterRoleResult = await pool.query<WorkspaceMember>(
      "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspace_id, requesterId]
    );

    if (requesterRoleResult.rowCount === 0) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const requesterRole = requesterRoleResult.rows[0].role;

    if (requesterRole !== "admin" && workspace.owner_id !== requesterId) {
      return res.status(403).json({
        message: "Only admin or owner can add members",
      });
    }

    if (role === "admin" && workspace.owner_id !== requesterId) {
      return res.status(403).json({
        message: "Only workspace owner can assign admin role",
      });
    }

    const userResult = await pool.query<User>(
      "SELECT id FROM users WHERE id = $1",
      [user_id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingMember = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspace_id, user_id]
    );

    if (existingMember.rows.length > 0) {
      return res.status(409).json({
        message: "User is already a member of this workspace",
      });
    }

    const newMember = await pool.query<WorkspaceMember>(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [workspace_id, user_id, role]
    );

    return res.status(201).json({
      message: "Member added successfully",
      member: newMember.rows[0],
    });

  } catch (error) {
    const err= error as Error;
    return res.status(500).json({
      message: err.message,
    });
  }
};
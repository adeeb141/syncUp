import { pool } from "../config/DB_connect.js";

export const addWorkspaceMember = async (req, res) => {
  try {
    const workspace_id = req.params.workspaceId;
    const { userId, role } = req.body;
    const requesterId = req.user.id;

    if (!userId || !role) {
      return res.status(400).json({
        message: "userId and role are required",
      });
    }

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const workspaceResult = await pool.query(
      "SELECT id, owner_id FROM workspaces WHERE id = $1",
      [workspace_id]
    );

    if (workspaceResult.rowCount === 0) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const workspace = workspaceResult.rows[0];

    const requesterRoleResult = await pool.query(
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

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingMember = await pool.query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [workspace_id, userId]
    );

    if (existingMember.rowCount > 0) {
      return res.status(409).json({
        message: "User is already a member of this workspace",
      });
    }

    const newMember = await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [workspace_id, userId, role]
    );

    return res.status(201).json({
      message: "Member added successfully",
      member: newMember.rows[0],
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};
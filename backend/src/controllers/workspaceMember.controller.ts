import { pool } from "../config/DB_connect";
import { Request, Response } from "express";
import { getClients } from "../socket";
import { emitMemberRemoved } from "../socket/emitter";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: Date;
}
interface WorkspaceMember {
  workspace_id: string,
  user_id: string,
  role: "owner" | "admin" | "member",
  joined_at: Date
}
interface MemberBody {
  workspace_id: string,
  user_id: string,
  role: "owner" | "admin" | "member"
}
interface UpdateRoleWorkspaceMemberBody {
  newRole: "member" | "admin",
  user_id: string
}

interface RemoveWorkspaceMemberBody{
  user_id:string
}
interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_verified: boolean,
  created_at: Date;
}

export const addWorkspaceMember = async (req: Request<{ workspaceId: string }, {}, MemberBody>, res: Response): Promise<Response | void> => {
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
    const clients=getClients();

    if(clients.has(user_id)){
      const socket=clients.get(user_id);
      if(socket){
        socket.send(JSON.stringify({
          type:"MEMBER_ADDED_TO_WORKSPACE",
          category:"notification",
          payload:{
            workspaceId:workspace_id,
            message:"You have been added to a workspace"
          }
      }))
      }
    }
    return res.status(201).json({
      message: "Member added successfully",
      member: newMember.rows[0],
    });

  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      message: err.message,
    });
  }
};

export const updateRoleOfWorkspaceMembers = async (req: Request<{ workspace_id: string }, {}, UpdateRoleWorkspaceMemberBody>, res: Response):
  Promise<Response | void> => {
  try {
    const workspace_id = req.params.workspace_id;
    const { newRole, user_id } = req.body;
    const updater_id = req.user?.id;

    if (!updater_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!newRole) {
      return res.status(400).json({ message: "please provide the new role" })
    }

    //check if the updater exist and is also an owner and the workspace exist
    const check = await pool.query<WorkspaceMember>(
      `SELECT wm.role
       FROM workspaces w
       LEFT JOIN workspace_members wm
       ON w.id=wm.workspace_id AND wm.user_id=$1
       WHERE w.id=$2
       `,
      [updater_id, workspace_id]
    )
    if (check.rowCount === 0) {
      return res.status(403).json({ message: "workspace doesnt exist" });
    }
    if (check.rows[0].role === null) {
      return res.status(403).json({ message: "updater is not a member of the workspace" })
    }
    if (check.rows[0].role !== "owner") {
      return res.status(403).json({ message: "only owner can change the roles" })
    }

    //check if the user belongs to the workspace and is not the owner of it
    const checkUser = await pool.query(
      "SELECT role FROM workspace_members where workspace_id=$1 AND user_id=$2",
      [workspace_id, user_id]
    )
    if (checkUser.rowCount === 0) {
      return res.status(404).json({ message: "User is not a member of the workspace" })
    }
    if (checkUser.rows[0].role === "owner") {
      return res.status(403).json({ message: "Owner's role cannot be changed" });
    }

    //update the role
    const updateRole = await pool.query(
      `UPDATE workspace_members
       SET role=$1
       WHERE user_id=$2 AND workspace_id=$3
       RETURNING *`,
      [newRole, user_id, workspace_id]
    )

    return res.status(200).json({
      message: "role updated successfully",
      update: updateRole.rows[0]
    })

  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      message: err.message,
    });
  }
}

export const removeWorkspaceMembers = async (req: Request<{ workspaceId: string }, {},RemoveWorkspaceMemberBody>, res: Response):
  Promise<Response | void> => {
  try {
    const workspace_id = req.params.workspaceId;
    console.log(workspace_id);
    const remover_id = req.user?.id;
    const user_id=req.body.user_id;

    if (!remover_id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    if (remover_id === user_id) {
      return res.status(400).json({ message: "You cannot remove yourself from the workspace" });
    }

    //check if workspace exist,and remover role 
    const check = await pool.query(
      `SELECT wm.role
           FROM workspaces w
           LEFT JOIN workspace_members wm
           ON w.id=wm.workspace_id AND wm.user_id=$1
           WHERE w.id=$2`,
      [remover_id, workspace_id]
    );

    if (check.rowCount === 0) {
      return res.status(404).json({ message: "workspace doesnt exist" });
    }
    if (check.rows[0].role === null) {
      return res.status(403).json({ message: "You are not a member of this workspace" })
    }
    if (check.rows[0].role === "member"){
      return res.status(403).json({ message: "member cannot remove another member" })
    }
    const remover_role=check.rows[0].role;
    
    //check if the user is member of the workspace
    const userCheck = await pool.query<WorkspaceMember>(
      `SELECT role FROM workspace_members WHERE user_id=$1 AND workspace_id=$2 `,
      [user_id,workspace_id]
    );
    if(userCheck.rowCount===0){
      return res.status(404).json({message:"user is not member of the workspace"});
    }
    if(userCheck.rows[0].role==="owner"){
      return res.status(403).json({message:"ownership can only be transferred"});
    }

    const user_role=userCheck.rows[0].role;

    if(user_role==="admin" && remover_role!=="owner"){
       return res.status(403).json({message:"only owner can remove admin"})
    }

    //unassign tasks and remove member in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Unassign the removed user from tasks in this workspace
      await client.query(
        `UPDATE tasks 
         SET assignee_id = NULL 
         WHERE assignee_id = $1 
         AND project_id IN (
           SELECT id FROM projects WHERE workspace_id = $2
         )`,
        [user_id, workspace_id]
      );

      // Remove member
      await client.query(
        `DELETE FROM workspace_members 
         WHERE user_id=$1 AND workspace_id=$2`,
        [user_id, workspace_id]
      );

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await emitMemberRemoved(workspace_id, user_id);

    return res.status(200).json({
      message: "Member removed and unassigned from tasks",
      member_id: user_id
    })

  } catch (error) {
    const err = error as Error;
    return res.status(500).json({
      message: err.message,
    });
  }
}

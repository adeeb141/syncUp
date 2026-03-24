import { log } from "node:console";
import { pool } from "../config/DB_connect";
import { Request, Response } from "express";

interface Workspace {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: Date;
}
interface workspaceMember {
    workspace_id: string,
    user_id: string,
    role: "owner" | "admin" | "member",
    joined_at: Date
}
interface WorkspaceReqBody {
    name: string,
    slug: string,
}

export const createWorkspace = async (req: Request<{}, {}, WorkspaceReqBody>, res: Response): Promise<Response | void> => {
    const client = await pool.connect();
    try {
        console.log("in create workspace");

        await client.query("BEGIN");

        const { name, slug } = req.body;

        const userId = req.user?.id;

        if (!name || !slug) {
            return res.status(400).json({ message: "Name and slug are required" });
        }

        const workspace = await client.query<Workspace>("INSERT INTO workspaces (name,slug,owner_id) VALUES ($1,$2,$3) RETURNING *", [name, slug, userId]);

        const workspace_id = workspace.rows[0].id;

        await client.query<workspaceMember>("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES ($1,$2,$3) RETURNING *", [workspace_id, userId, "owner"]);

        await client.query("COMMIT");

        const resWorkspace = { ...workspace.rows[0], role: "owner" }
        res.status(201).json({
            message: "Workspace Created",
            workspace: resWorkspace
        });

    } catch (e) {
        await client.query("ROLLBACK");
        const err = e as Error;
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
}

export const deleteWorkspace = async (req: Request<{ workspace_id: string }, {}, {}>, res: Response):
    Promise<Response | void> => {
    try {
        const workspace_id = req.params.workspace_id;
        const user_id = req.user?.id;

        //check if user is authorized 
        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const check = await pool.query(
            `SELECT w.id, wm.role 
             FROM workspaces w
             LEFT JOIN workspace_members wm 
             ON wm.workspace_id = w.id AND wm.user_id = $2
             WHERE w.id = $1`,
            [workspace_id, user_id]
        )

        //check if workspace exist
        if (check.rowCount === 0) {
            return res.status(404).json({ message: "Workspace not found" })
        }
        //check if user exist in workspace
        if (check.rows[0].role === null) {
            return res.status(403).json({ message: "User does not exist in the workspace" });
        }

        //check if user is owner of the workspace
        if (check.rows[0].role !== "owner") {
            return res.status(403).json({ message: "Only owner of the workspace can delete it" });
        }

        //delete workspace
        const removeWorkspace = await pool.query(
            "DELETE FROM workspaces WHERE id=$1",
            [workspace_id]
        )
        if (removeWorkspace.rowCount === 0) {
            return res.status(404).json({ message: "Workspace not found" });
        }
        return res.status(200).json({ message: "Workspace deleted", workspace_id });
    } catch (e) {
        const err = e as Error;
        res.status(500).json({ message: err.message });
    }

}

interface UpdateWorkspaceBody {
    newName?: string,
    newSlug?: string,
}

export const updateWorkspace = async (req: Request<{ workspace_id: string }, {}, UpdateWorkspaceBody>, res: Response):
    Promise<Response | void> => {
    try {
        const workspace_id = req.params.workspace_id;
        const user_id = req.user?.id;

        //check if user is authorized 
        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const newName = req.body.newName ?? null;
        const newSlug = req.body.newSlug ?? null;

        if (!newName && !newSlug) {
            return res.status(400).json({ message: "Nothing to update" });
        }
        //check if workspace exist and user is owner or admin of the workspace
        const check = await pool.query(
            `SELECT wm.role, w.id
             FROM workspaces w
             LEFT JOIN workspace_members wm
             ON wm.workspace_id=w.id AND wm.user_id=$2
             WHERE w.id=$1`,
            [workspace_id, user_id]
        );

        if (check.rowCount === 0) {
            return res.status(404).json({ message: "Workspace not found" })
        }
        if (check.rows[0].role === null) {
            return res.status(403).json({ message: "User does not exist in the workspace" });
        }
        if (check.rows[0].role !== "owner" && check.rows[0].role !== "admin") {
            return res.status(403).json({ message: "Only owner and admin of the workspace can rename it" });
        }

        //update name and slug
        const update = await pool.query<Workspace>(
            `UPDATE workspaces 
             SET name=COALESCE($2,name),
                 slug=COALESCE($3,slug)
             WHERE id=$1
             RETURNING *`,
            [workspace_id, newName, newSlug]
        );

        return res.status(200).json({ message: "Update Successful", update: update.rows[0] });

    } catch (e) {
        const err = e as any;
        if (err.code === "23505") {
            return res.status(400).json({ message: "Workspace with this name or slug already exists" });
        }
        res.status(500).json({ message: err.message });
    }
}

export const getUserWorkspaces = async (req: Request<{}, {}, {}>, res: Response):
    Promise<Response | void> => {
    try {
        console.log("In get");

        const user_id = req.user?.id;

        //check if user is authorized 
        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        //return the workspaces of the user
        const userWorkspaces = await pool.query(
            `SELECT wm.workspace_id,w.name,w.slug,w.owner_id,w.created_at,wm.role
             FROM workspace_members wm
             JOIN workspaces w
             ON wm.workspace_id=w.id AND wm.user_id=$1`,
            [user_id]
        )
        if (userWorkspaces.rowCount === 0) {
            return res.status(404).json({ message: "user is not part of any workspace" });
        }

        return res.status(200).json({ workspaces: userWorkspaces.rows });


    } catch (e) {
        const err = e as Error;
        res.status(500).json({ message: err.message });
    }
}

export const getWorkspaceProjectsAndMembers = async (req: Request<{ workspace_id: string }, {}, {}>, res: Response):
    Promise<Response | void> => {
    try {
        const workspace_id = req.params.workspace_id;

        //check if workspace exist and return the workspace's info
        const check=await pool.query(`
            SELECT FROM workspaces WHERE id=${1}`,
            [workspace_id])
        if(check.rowCount===0){
            return res.status(404).json({ message: "Workspace doesnt exist" });
        }
        const [checkAndReturnMembers,checkAndReturnProjects]=await Promise.all([
            pool.query(
            `SELECT wm.user_id, wm.role, u.name
             FROM workspace_members wm
             LEFT JOIN users u
             ON wm.user_id = u.id
             WHERE wm.workspace_id = $1;`,
            [workspace_id]),
            pool.query(
            ` SELECT id, name, created_by
              FROM projects
              WHERE workspace_id = $1`,
             [workspace_id])
            ])
        const workspaceMembers=checkAndReturnMembers.rows;
        const workspaceProjects=checkAndReturnProjects.rows;

        res.status(200).json({
            workspaceMembers,
            workspaceProjects
        })
    } catch (e) {
        const err = e as Error;
        res.status(500).json({ message: err.message });
    }
}
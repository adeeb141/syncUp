import { pool } from "../config/DB_connect";
import { Request,Response } from "express";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: Date;
}
interface workspaceMember{
    workspace_id:string,
    user_id:string,
    role:"owner" | "admin" | "member",
    joined_at:Date
}
interface WorkspaceReqBody{
    name:string,
    slug:string,
}
interface requestUser{
    id:string,
    email:string
}
export const createWorkspace = async (req:Request<{},{},WorkspaceReqBody>, res:Response): Promise<Response | void> => {
    const client = await pool.connect();
    try {
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


        res.status(201).json({
            message: "Workspace Created",
        });

    } catch (e) {
        await client.query("ROLLBACK");
        const err=e as Error;
        res.status(500).json({ message: err.message });
    } finally{
        client.release();
    }
}
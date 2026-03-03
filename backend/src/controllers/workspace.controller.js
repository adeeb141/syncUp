import { pool } from "../config/DB_connect.js";
export const createWorkspace = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { name, slug } = req.body;
        
        const userId = req.user.id;

        if (!name || !slug) {
            return res.status(400).json({ message: "Name and slug are required" });
        }

        const workspace = await client.query("INSERT INTO workspaces (name,slug,owner_id) VALUES ($1,$2,$3) RETURNING *", [name, slug, userId]);

        const workspace_id = workspace.rows[0].id;

        await client.query("INSERT INTO workspace_members(workspace_id,user_id,role) VALUES ($1,$2,$3) RETURNING *", [workspace_id, userId, "owner"]);

        await client.query("COMMIT");


        res.status(201).json({
            message: "Workspace Created",
        });

    } catch (e) {
        await client.query("ROLLBACK");
        res.status(500).json({ message: e.message });
    } finally{
        client.release();
    }
}
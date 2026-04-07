import { Request, Response } from "express";
import { pool } from "../config/DB_connect";

// ======================= CREATE DOCUMENT =======================

interface CreateDocumentBody {
  name: string;
  description?: string;
  access: "view_only" | "open_collab" | "selective";
  project_id?: string;
  task_id?: string;
  collaborator_ids?: string[]; // user IDs for selective access
}

export const createDocument = async (
  req: Request<{ workspace_id: string }, {}, CreateDocumentBody>,
  res: Response
): Promise<Response | void> => {
  const client = await pool.connect();
  try {
    const user_id = req.user?.id;
    const { workspace_id } = req.params;
    const { name, description, access, project_id, task_id, collaborator_ids } = req.body;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });
    if (!name?.trim()) return res.status(400).json({ message: "Document name is required" });

    // validate workspace membership
    const memberCheck = await client.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [workspace_id, user_id]
    );
    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ message: "Not part of workspace" });
    }

    // if project_id given, validate it belongs to this workspace
    if (project_id) {
      const projCheck = await client.query(
        `SELECT 1 FROM projects WHERE id=$1 AND workspace_id=$2`,
        [project_id, workspace_id]
      );
      if (projCheck.rowCount === 0) {
        return res.status(400).json({ message: "Project not found in this workspace" });
      }
    }

    // if task_id given, validate it belongs to the specified project
    if (task_id) {
      if (!project_id) {
        return res.status(400).json({ message: "Project is required when attaching to a task" });
      }
      const taskCheck = await client.query(
        `SELECT 1 FROM tasks WHERE id=$1 AND project_id=$2`,
        [task_id, project_id]
      );
      if (taskCheck.rowCount === 0) {
        return res.status(400).json({ message: "Task not found in this project" });
      }
    }

    // validate collaborator_ids if selective
    if (access === "selective" && collaborator_ids && collaborator_ids.length > 0) {
      const collabCheck = await client.query(
        `SELECT user_id FROM workspace_members
         WHERE workspace_id=$1 AND user_id = ANY($2::uuid[])`,
        [workspace_id, collaborator_ids]
      );
      if (collabCheck.rowCount !== collaborator_ids.length) {
        return res.status(400).json({ message: "Some collaborators are not workspace members" });
      }
    }

    await client.query("BEGIN");

    // insert document — room_name is generated server-side
    const doc = await client.query(
      `INSERT INTO documents(name, description, access, workspace_id, project_id, task_id, room_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name.trim(),
        description || "",
        access || "open_collab",
        workspace_id,
        project_id || null,
        task_id || null,
        `doc-${workspace_id}-${crypto.randomUUID()}`, // unique room name
        user_id,
      ]
    );

    const newDoc = doc.rows[0];

    // insert collaborators for selective access
    if (access === "selective" && collaborator_ids && collaborator_ids.length > 0) {
      // always include the creator
      const allCollabs = Array.from(new Set([user_id, ...collaborator_ids]));
      const values = allCollabs.map((uid, i) => `($1, $${i + 2})`).join(", ");
      const params = [newDoc.id, ...allCollabs];
      await client.query(
        `INSERT INTO document_collaborators(document_id, user_id) VALUES ${values}`,
        params
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Document created",
      document: newDoc,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// ======================= GET WORKSPACE DOCUMENTS =======================

export const getWorkspaceDocuments = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const user_id = req.user?.id;
    const { workspace_id } = req.params;
    const { project_id, task_id } = req.query;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    // validate workspace membership
    const memberCheck = await pool.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [workspace_id, user_id]
    );
    if (memberCheck.rowCount === 0) {
      return res.status(403).json({ message: "Not part of workspace" });
    }

    let query = `SELECT d.*, u.name as creator_name
                 FROM documents d
                 LEFT JOIN users u ON u.id = d.created_by
                 WHERE d.workspace_id = $1`;
    const values: any[] = [workspace_id];

    if (project_id) {
      values.push(project_id);
      query += ` AND d.project_id = $${values.length}`;
    }

    if (task_id) {
      values.push(task_id);
      query += ` AND d.task_id = $${values.length}`;
    }

    query += ` ORDER BY d.created_at DESC`;

    const docs = await pool.query(query, values);

    return res.status(200).json({ documents: docs.rows });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

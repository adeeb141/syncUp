import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3";
import { pool } from "../config/DB_connect";


// ======================= UPLOAD =======================

export const uploadFile = async (req: any, res: any) => {
  try {
    const user_id = req.user?.id;
    const { workspace_id, project_id, task_id } = req.body;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "File required" });

    // workspace membership check
    const check = await pool.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [workspace_id, user_id]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ message: "Not part of workspace" });
    }

    // task validation
    if (task_id) {
      const taskCheck = await pool.query(
        `SELECT p.workspace_id 
         FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE t.id=$1`,
        [task_id]
      );

      if (taskCheck.rowCount === 0) {
        return res.status(400).json({ message: "Invalid task" });
      }

      if (taskCheck.rows[0].workspace_id !== workspace_id) {
        return res.status(403).json({ message: "Task not in workspace" });
      }
    }

    const fileKey = `workspace/${workspace_id}/project/${project_id || "none"}/task/${task_id || "none"}/${Date.now()}-${req.file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    // 🔥 STORE KEY HERE
    const result = await pool.query(
      `INSERT INTO files(name,url,key,size,type,workspace_id,project_id,task_id,uploaded_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        req.file.originalname,
        fileUrl,
        fileKey, // ✅ NEW
        req.file.size,
        req.file.mimetype,
        workspace_id,
        project_id || null,
        task_id || null,
        user_id,
      ]
    );

    return res.status(201).json({
      message: "File uploaded",
      file: result.rows[0],
    });

  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};


// ======================= GET FILES =======================
// ── Replace your existing getFiles in file.controller.ts ────────────────────
// Only the query section changes — add offset support

export const getFiles = async (req: any, res: any) => {
  try {
    const user_id = req.user?.id;
    const { workspace_id, project_id, task_id, limit = 10, offset = 0 } = req.query;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const check = await pool.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [workspace_id, user_id]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ message: "Not part of workspace" });
    }

    let query = `SELECT * FROM files WHERE workspace_id=$1`;
    const values: any[] = [workspace_id];

    if (project_id) {
      values.push(project_id);
      query += ` AND project_id=$${values.length}`;
    }

    if (task_id) {
      values.push(task_id);
      query += ` AND task_id=$${values.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    // ── Pagination ──
    values.push(limit);
    query += ` LIMIT $${values.length}`;

    values.push(offset);
    query += ` OFFSET $${values.length}`;

    const files = await pool.query(query, values);

    return res.status(200).json({ files: files.rows });

  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
// ======================= DELETE FILE =======================

export const deleteFile = async (req: any, res: any) => {
  try {
    const user_id = req.user?.id;
    const { file_id } = req.params;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const file = await pool.query(
      `SELECT * FROM files WHERE id=$1`,
      [file_id]
    );

    if (file.rowCount === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileData = file.rows[0];

    const member = await pool.query(
      `SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [fileData.workspace_id, user_id]
    );

    if (member.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const role = member.rows[0].role;

    if (
      fileData.uploaded_by !== user_id &&
      role !== "admin" &&
      role !== "owner"
    ) {
      return res.status(403).json({ message: "Not allowed to delete this file" });
    }

    // 🔥 USE STORED KEY
    const fileKey = fileData.key;

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey
    }));

    await pool.query(`DELETE FROM files WHERE id=$1`, [file_id]);

    return res.status(200).json({ message: "File deleted" });

  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};


// ======================= SIGNED URL =======================

export const getFileUrl = async (req: any, res: any) => {
  try {
    const user_id = req.user?.id;
    const { file_id } = req.params;

    if (!user_id) return res.status(401).json({ message: "Unauthorized" });

    const file = await pool.query(
      `SELECT * FROM files WHERE id=$1`,
      [file_id]
    );

    if (file.rowCount === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const fileData = file.rows[0];

    const check = await pool.query(
      `SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2`,
      [fileData.workspace_id, user_id]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // 🔥 USE STORED KEY
    const fileKey = fileData.key;

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60 * 5,
    });

    return res.status(200).json({ url: signedUrl });

  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
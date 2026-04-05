import { Request, Response } from "express";
import { pool } from "../config/DB_connect";
import { emitTaskAssigned, emitTaskUpdated, emitTaskDeleted } from "../socket/emitter";

interface CreateTaskBody {
    parent_task_id?: string,
    title: string,
    description: string,
    status?: "todo" | "in_progress" | "done",
    priority?: "low" | "medium" | "high",
    assignee_id: string,
    due_date: string,
    position: number
}

export const addTaskToProject = async (req: Request<{ project_id: string }, {}, CreateTaskBody>, res: Response): Promise<Response | void> => {
    try {
        const { title, description } = req.body;
        const creator_id = req.user?.id;
        const project_id = req.params.project_id;

        const parent_task_id = req.body.parent_task_id ?? null;
        const status = req.body.status ?? "todo";
        const priority = req.body.priority ?? "medium";
        const assignee_id = req.body.assignee_id ?? creator_id; // 🔥 default = creator
        const due_date = req.body.due_date ?? null;
        const position = req.body.position ?? 0;

        //creator authorized?
        if (!creator_id) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }
        //project exist? creator in workspace?
        const checkProjectandWorkspace = await pool.query(
            `SELECT p.workspace_id, wm.role
   FROM projects p
   JOIN workspace_members wm
   ON wm.workspace_id = p.workspace_id AND wm.user_id = $2
   WHERE p.id = $1
   LIMIT 1`,
            [project_id, creator_id]
        );


        if (checkProjectandWorkspace.rowCount === 0) {
            return res.status(404).json({ message: "Project not found" })
        }
        if (checkProjectandWorkspace.rows[0].role === null) {
            return res.status(403).json({ message: "creator doesnt exist in workspace" })
        }
        const workspace_id = checkProjectandWorkspace.rows[0].workspace_id;

        //check assignee part of workspace?
        const checkAssignee = await pool.query(
            `SELECT 1 FROM workspace_members
             WHERE workspace_id=$1 AND user_id=$2`,
            [workspace_id, assignee_id]
        )
        if (checkAssignee.rowCount === 0) {
            return res.status(400).json({
                message: "Assignee is not part of workspace"
            })
        }
        //check if parent task is in same project
        if (parent_task_id) {
            const checkParentTask = await pool.query(
                "SELECT 1 FROM tasks WHERE project_id=$1 AND id=$2",
                [project_id, parent_task_id]
            )
            if (checkParentTask.rowCount === 0) {
                return res.status(404).json({ message: "The parent task does not exist in this project" })
            }
        }

        //add task to project
        const newTask = await pool.query(
            `INSERT INTO tasks(project_id,parent_task_id,title,description,status,priority,assignee_id,created_by,due_date,position)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [project_id, parent_task_id, title, description, status, priority, assignee_id, creator_id, due_date, position]
        );

        // notify the assignee
        emitTaskAssigned(assignee_id, newTask.rows[0]);

        return res.status(201).json(newTask.rows[0]);

    } catch (error) {
        const err = error as any;
        if (err.code === "23505") {
            return res.status(400).json({
                message: "Task with this title already exists in this project"
            })
        }
        return res.status(500).json({ message: err.message });
    }
}

// ── Update Task (rename / change assignee) ──────────────────────

interface UpdateTaskBody {
    title?: string;
    assignee_id?: string;
}

export const updateTask = async (
    req: Request<{ task_id: string }, {}, UpdateTaskBody>,
    res: Response
): Promise<Response | void> => {
    try {
        const { task_id } = req.params;
        const requester_id = req.user?.id;
        const { title, assignee_id } = req.body;

        if (!requester_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!title && !assignee_id) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        // check task exists and get workspace_id + old assignee
        const taskCheck = await pool.query<{
            workspace_id: string;
            assignee_id: string;
        }>(
            `SELECT p.workspace_id, t.assignee_id
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = $1`,
            [task_id]
        );

        if (taskCheck.rowCount === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const { workspace_id } = taskCheck.rows[0];
        const oldAssigneeId = taskCheck.rows[0].assignee_id;

        // check requester is a workspace member
        const memberCheck = await pool.query(
            `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspace_id, requester_id]
        );

        if (memberCheck.rowCount === 0) {
            return res.status(403).json({ message: "You are not a member of this workspace" });
        }

        // if changing assignee, validate new assignee is in workspace
        if (assignee_id) {
            const assigneeCheck = await pool.query(
                `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
                [workspace_id, assignee_id]
            );
            if (assigneeCheck.rowCount === 0) {
                return res.status(400).json({ message: "New assignee is not part of workspace" });
            }
        }

        // update
        const updated = await pool.query(
            `UPDATE tasks
             SET title      = COALESCE($2, title),
                 assignee_id = COALESCE($3, assignee_id),
                 updated_at  = NOW()
             WHERE id = $1
             RETURNING *`,
            [task_id, title ?? null, assignee_id ?? null]
        );

        const updatedTask = updated.rows[0];

        // emit to all workspace members
        await emitTaskUpdated(workspace_id, updatedTask);

        // if assignee changed, notify the new assignee
        if (assignee_id && assignee_id !== oldAssigneeId) {
            emitTaskAssigned(assignee_id, updatedTask);
        }

        return res.status(200).json({
            message: "Task updated",
            task: updatedTask,
        });
    } catch (error) {
        const err = error as any;
        if (err.code === "23505") {
            return res.status(400).json({
                message: "Task with this title already exists in this project",
            });
        }
        return res.status(500).json({ message: err.message });
    }
};

// ── Delete Task ─────────────────────────────────────────────────

export const deleteTask = async (
    req: Request<{ task_id: string }, {}, {}>,
    res: Response
): Promise<Response | void> => {
    try {
        const { task_id } = req.params;
        const requester_id = req.user?.id;

        if (!requester_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // check task exists, get workspace context
        const taskCheck = await pool.query<{
            workspace_id: string;
            created_by: string;
        }>(
            `SELECT p.workspace_id, t.created_by
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             WHERE t.id = $1`,
            [task_id]
        );

        if (taskCheck.rowCount === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        const { workspace_id, created_by } = taskCheck.rows[0];

        // check requester role in workspace
        const memberCheck = await pool.query<{ role: string }>(
            `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
            [workspace_id, requester_id]
        );

        if (memberCheck.rowCount === 0) {
            return res.status(403).json({ message: "You are not a member of this workspace" });
        }

        const role = memberCheck.rows[0].role;

        // only owner, admin, or task creator can delete
        if (role !== "owner" && role !== "admin" && created_by !== requester_id) {
            return res.status(403).json({ message: "You do not have permission to delete this task" });
        }

        await pool.query(`DELETE FROM tasks WHERE id = $1`, [task_id]);

        // broadcast deletion to workspace
        await emitTaskDeleted(workspace_id, task_id);

        return res.status(200).json({ message: "Task deleted", taskId: task_id });
    } catch (error) {
        const err = error as Error;
        return res.status(500).json({ message: err.message });
    }
};

export const getUserTasks = async (req: Request<{}, {}, {}>, res: Response): Promise<Response | void> => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const tasks = await pool.query(
            `SELECT 
                t.*, 
                p.name as project_name,
                p.workspace_id,
                w.name as workspace_name,
                u_assignee.name as assignee_name,
                u_creator.name as created_by_name
             FROM tasks t
             JOIN projects p ON p.id = t.project_id
             JOIN workspaces w ON w.id = p.workspace_id
             LEFT JOIN users u_assignee ON u_assignee.id = t.assignee_id
             LEFT JOIN users u_creator ON u_creator.id = t.created_by
             WHERE t.assignee_id = $1
             ORDER BY t.due_date ASC NULLS LAST, t.created_at ASC`,
            [user_id]
        );

        return res.status(200).json({ tasks: tasks.rows });
    } catch (error) {
        const err = error as Error;
        return res.status(500).json({ message: err.message });
    }
};

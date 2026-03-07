import { Request, Response } from "express";
import { pool } from "../config/DB_connect";

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
        const { title, description, assignee_id, due_date,position } = req.body;
        const creator_id = req.user?.id;
        const parent_task_id = req.body.parent_task_id ?? null;
        const status = req.body.status ?? "todo";
        const priority = req.body.priority ?? "medium";
        const project_id = req.params.project_id;

        //creator authorized?
        if (!creator_id) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        //project exist? creator in workspace?
        const checkProjectandWorkspace = await pool.query(
            `SELECT p.workspace_id, wm.role
            FROM projects p
            LEFT JOIN workspace_members wm
            ON wm.workspace_id=p.workspace_id
            WHERE p.id=$1 AND wm.user_id=$2
            LIMIT 1`,
            [project_id, creator_id]
        );


        if (checkProjectandWorkspace.rowCount === 0) {
            return res.status(404).json({ message: "Project not found" })
        }
        if(checkProjectandWorkspace.rows[0].role===null){
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
        if(parent_task_id){
            const checkParentTask = await pool.query(
                "SELECT 1 FROM tasks WHERE project_id=$1 AND id=$2",
                 [project_id,parent_task_id]
            )
            if(checkParentTask.rowCount===0){
                return res.status(404).json({message:"The parent task does not exist in this project"})
            }
        }

        //add task to project
        const newTask = await pool.query<CreateTaskBody>(
            `INSERT INTO tasks(project_id,parent_task_id,title,description,status,priority,assignee_id,created_by,due_date,position)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [project_id, parent_task_id, title, description, status, priority, assignee_id, creator_id, due_date,position]
        );

        return res.status(201).json({
            message: "Task added to project",
            task: newTask.rows[0]
        });

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
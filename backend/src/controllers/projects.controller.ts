import { Request, Response } from "express";
import { pool } from "../config/DB_connect";

interface CreateProjectBody {
    name: string,
    description: string,
    status?: "active" | "completed",
}
interface WorkspaceMember {
    workspace_id: string,
    user_id: string,
    role: "owner" | "admin" | "member",
    joined_at: Date
}
export const addProjectToWorkspace = async (req: Request<{ workspace_id: string }, {}, CreateProjectBody>, res: Response): Promise<Response | void> => {
    try {
        const { name, description } = req.body;
        const workspace_id = req.params.workspace_id;
        const creator_id = req.user?.id;
        const status = req.body.status ?? "active";

        if (!creator_id) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        //checking if workspace exists
        const checkWorkspace = await pool.query(
            "SELECT 1 FROM workspaces WHERE id=$1",
            [workspace_id]
        );

        if (checkWorkspace.rowCount === 0) {
            return res.status(400).json({ message: "Workspace not found" })
        }

        //check if the creater of project is member of the workspace
        const checkCreatorInWorkspace = await pool.query<WorkspaceMember>(
            "SELECT * from workspace_members WHERE workspace_id=$1 AND user_id=$2",
            [workspace_id, creator_id]
        );

        if (checkCreatorInWorkspace.rowCount === 0) {
            return res.status(401).json({ message: "You are not a member of this workspace" })
        };

        //add project to workspace
        const newProject = await pool.query<CreateProjectBody>(
            "INSERT INTO projects(workspace_id,name,description,status,created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *",
            [workspace_id, name, description, status, creator_id]
        );

        return res.status(201).json({
            message: "Project added to workspace",
            project: newProject.rows[0]
        });

    } catch (error) {
        const err = error as any;
        if (err.code === "23505") {
            return res.status(400).json({
                message: "Project with this name already exists"
            })
        }
        return res.status(500).json({ message: err.message });
    }

}

export const removeProject= async(req:Request<{project_id:string},{},{}>,res:Response):
Promise<Response | void> =>{
     try{
        const project_id=req.params.project_id;
        const remover_id=req.user?.id;
        
        //only owner,admin and the creator of the project can remove the project
        //check if project exist
        
        const check= await pool.query(
            `SELECT wm.role,p.created_by
             FROM projects p
             LEFT JOIN workspace_members wm
             ON p.workspace_id=wm.workspace_id AND wm.user_id=$2
             WHERE p.id=$1`,
             [project_id,remover_id]
        );

        if(check.rowCount===0){
            return res.status(401).json({message:"Project with this id doesnt exist"});
        }
        if(check.rows[0].role===null){
            return res.status(403).json({message:"user is not part of the workspace"});
        }
        const role=check.rows[0].role;
        const project_creator=check.rows[0].created_by;

        if(role!=="owner" && role!=="admin" && project_creator!==remover_id){
            return res.status(403).json({message:"member cannot delete a project"});
        }
        //delete project

        await pool.query(
            `DELETE FROM projects
             WHERE id=$1`
        )
        return res.status(200).json({message:"Deleted project with id: ",id:project_id});
        
     }catch(err){
        const error = err as Error;
        return res.status(500).json({ message: error.message });
     }
}

import { Request,Response } from "express";
import { pool } from "../config/DB_connect";

export const userNotInWorkspaceSearch=async(req:Request<{workspace_id:string},{},{email:string}>,res:Response):Promise<Response | void> =>{
  try{
     const email=req.body.email;
     const workspace_id = req.params.workspace_id;

     if (!workspace_id) {
       return res.status(400).json({ message: "Workspace ID is required" });
     }

     const check=await pool.query(
      `SELECT id, name, email,
       EXISTS(
         SELECT 1 FROM workspace_invites 
         WHERE invited_user_id = users.id 
         AND workspace_id = $2 
         AND status = 'pending'
       ) as "isInvited"
       FROM users
       WHERE email ILIKE $1
       AND id NOT IN (
         SELECT user_id 
         FROM workspace_members 
         WHERE workspace_id = $2
       )
       LIMIT 10`,
       [`%${email}%`, workspace_id]
     );
     
     return res.status(200).json({
      users: check.rows
     });
     
  }catch(error){
    const err = error as Error;
    return res.status(500).json({
      message: err.message,
    });
  }
}
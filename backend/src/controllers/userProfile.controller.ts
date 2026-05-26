import { pool } from "../config/DB_connect";
import { Request,Response } from "express";
import { matchPassword } from "../utils/hash";
import { hashPassword } from "../utils/hash";

interface ChangePasswordBody{
    oldPassword:string,
    newPassword:string
}
export const changePassword = async(req:Request<{},{},ChangePasswordBody>,res:Response):Promise<Response|void>=>{
    try{
        const oldPassword = req.body.oldPassword;
        const newPassword = req.body.newPassword;
        const user_id = req.user?.id;
        //check if user is authenticated
        if(!user_id){
            return res.status(401).json({message:"User is not authorized"});
        }
        //match old password
        const oldPasswordHash = await pool.query(`
            SELECT password_hash FROM users WHERE id=$1 LIMIT 1`,
            [user_id]);
        
        if(oldPasswordHash.rowCount===0){
            return res.status(404).json({message:"User does not exist"});
        }
        
        const matched = await matchPassword(oldPassword,oldPasswordHash.rows[0].password_hash);

        if(!matched){
            return res.status(401).json({message:"Wrong old password"});
        }
        const newPasswordHash = await hashPassword(newPassword);
        //change the password in DB
        const result = await pool.query(`
          UPDATE users
          SET password_hash = $1
          WHERE id = $2`,[newPasswordHash,user_id]);
        
          return res.status(200).json({message:"Password updated successfully"})

    }catch(e){
        const err = e as Error;
        res.status(500).json({ message: err.message });
    }
}
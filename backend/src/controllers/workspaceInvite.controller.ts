import { pool } from "../config/DB_connect";
import { Request, Response } from "express";
import { getClients } from "../socket";

interface Users{
    id:string
}
export const sendInvite = async (req: Request<{}, {}, { invited_user_email: string,workspace_id:string }>, res: Response): Promise<Response | void> => {
    try {
        const clients = getClients();
        const workspace_id = req.body.workspace_id;
        const invited_user_email = req.body.invited_user_email;
        const invited_by_id = req.user?.id;
        //fetch user_id for the email

        const getEmail =await pool.query<Users>("SELECT * from users WHERE email=$1",[invited_user_email]);
        const invited_user_id=getEmail.rows[0].id;

        //create db entry in workspace_invites
        const invite = await pool.query(
            `INSERT INTO workspace_invites(workspace_id,invited_user_id,invited_by_id) VALUES ($1,$2,$3)`,
            [workspace_id, invited_user_id, invited_by_id]
        );

        const [workspaceResult, userResult] = await Promise.all([
            pool.query("SELECT name FROM workspaces WHERE id=$1", [workspace_id]),
            pool.query("SELECT name,email FROM users WHERE id=$1", [invited_by_id])
        ]);

        const workspace_name = workspaceResult.rows[0].name;
        const user_name = userResult.rows[0].name;
        const email = userResult.rows[0].email;


        //send ws message to user
        const socket = clients.get(invited_user_id);
        if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify({
                type: "workspace_invite",
                category: "invite",
                payload: {
                    invited_by_name: user_name,
                    invited_by_email:email,
                    workspace_name:workspace_name
                }
            }))
        }

        res.status(200).json({
            message:"success"
        })


    } catch(e) {
        const err = e as any;
        if (err.code === "23505") {
            return res.status(400).json({ message: "Invite already exists for this workspace and this user" });
        }
        res.status(500).json({ message: err.message });
    }
}

export const acceptInvite = async (req: Request<{ workspace_id: string }, {}, {}>, res: Response): Promise<Response | void> => {
    try {
        


    } catch {

    }
}

export const rejectInvite = async (req: Request<{ workspace_id: string }, {},{}>, res: Response): Promise<Response | void> => {
    try {
        ;


    } catch {

    }
}
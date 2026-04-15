import { pool } from "../config/DB_connect";
import { Request, Response } from "express";
import { emitMemberAdded, emitWorkspaceInvite, emitWorkspaceInviteResponse, emitWorkspaceJoined } from "../socket/emitter";

interface Users{
    id:string
}
interface InviteDetails {
    id: string;
    workspace_id: string;
    invited_by_id: string;
    invited_user_id: string;
    workspace_name: string;
    invited_user_name: string;
    invited_user_email: string;
}
interface WorkspaceForUser {
    workspace_id: string;
    name: string;
    slug: string;
    description: string;
    owner_id: string;
    owner_email: string | null;
    created_at: Date;
    role: "owner" | "admin" | "member";
}
interface WorkspaceMemberWithName {
    workspace_id: string;
    user_id: string;
    role: "owner" | "admin" | "member";
    joined_at: Date;
    name: string;
}
export const sendInvite = async (req: Request<{}, {}, { invited_user_email: string,workspace_id:string }>, res: Response): Promise<Response | void> => {
    try {
        const workspace_id = req.body.workspace_id;
        const invited_user_email = req.body.invited_user_email;
        const invited_by_id = req.user?.id;
        if (!invited_by_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!workspace_id || !invited_user_email) {
            return res.status(400).json({ message: "workspace_id and invited_user_email are required" });
        }
        //fetch user_id for the email

        const getEmail =await pool.query<Users>("SELECT * from users WHERE email=$1",[invited_user_email]);
        if (getEmail.rowCount === 0) {
            return res.status(404).json({ message: "No user found with this email" });
        }
        const invited_user_id=getEmail.rows[0].id;

        //create db entry in workspace_invites
        const invite = await pool.query(
            `INSERT INTO workspace_invites(workspace_id,invited_user_id,invited_by_id) VALUES ($1,$2,$3) RETURNING id`,
            [workspace_id, invited_user_id, invited_by_id]
        );
        const invite_id = invite.rows[0].id;

        const [workspaceResult, userResult] = await Promise.all([
            pool.query("SELECT name FROM workspaces WHERE id=$1", [workspace_id]),
            pool.query("SELECT name,email FROM users WHERE id=$1", [invited_by_id])
        ]);

        const workspace_name = workspaceResult.rows[0].name;
        const user_name = userResult.rows[0].name;
        const email = userResult.rows[0].email;

        emitWorkspaceInvite(invited_user_id, {
            id: invite_id,
            workspace_id,
            invited_by_name: user_name,
            invited_by_email: email,
            workspace_name,
        });

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

export const acceptInvite = async (req: Request<{}, {}, { workspace_id: string }>, res: Response): Promise<Response | void> => {
    try {
        const workspace_id = req.body.workspace_id;
        const user_id = req.user?.id;

        if (!workspace_id || !user_id) return res.status(400).json({ message: "Missing required fields" });

        const inviteCheck = await pool.query<InviteDetails>(
            `SELECT
                wi.id,
                wi.workspace_id,
                wi.invited_by_id,
                wi.invited_user_id,
                w.name AS workspace_name,
                u.name AS invited_user_name,
                u.email AS invited_user_email
             FROM workspace_invites wi
             JOIN workspaces w ON w.id = wi.workspace_id
             JOIN users u ON u.id = wi.invited_user_id
             WHERE wi.workspace_id = $1 AND wi.invited_user_id = $2 AND wi.status = 'pending'
             LIMIT 1`,
            [workspace_id, user_id]
        );

        if (inviteCheck.rowCount === 0) {
            return res.status(404).json({ message: "No pending invite found" });
        }
        const inviteDetails = inviteCheck.rows[0];

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(
                "DELETE FROM workspace_invites WHERE id = $1 AND status = 'pending'",
                [inviteDetails.id]
            );
            await client.query(
                "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING",
                [workspace_id, user_id]
            );
            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        const [workspaceResult, memberResult] = await Promise.all([
            pool.query<WorkspaceForUser>(
                `SELECT
                    wm.workspace_id,
                    w.name,
                    w.slug,
                    w.description,
                    w.owner_id,
                    owner_user.email AS owner_email,
                    w.created_at,
                    wm.role
                 FROM workspace_members wm
                 JOIN workspaces w ON w.id = wm.workspace_id
                 LEFT JOIN users owner_user ON owner_user.id = w.owner_id
                 WHERE wm.workspace_id = $1 AND wm.user_id = $2
                 LIMIT 1`,
                [workspace_id, user_id]
            ),
            pool.query<WorkspaceMemberWithName>(
                `SELECT
                    wm.workspace_id,
                    wm.user_id,
                    wm.role,
                    wm.joined_at,
                    u.name
                 FROM workspace_members wm
                 LEFT JOIN users u ON u.id = wm.user_id
                 WHERE wm.workspace_id = $1 AND wm.user_id = $2
                 LIMIT 1`,
                [workspace_id, user_id]
            ),
        ]);

        if (memberResult.rowCount && memberResult.rowCount > 0) {
            await emitMemberAdded(workspace_id, memberResult.rows[0]);
        }
        if (workspaceResult.rowCount && workspaceResult.rowCount > 0) {
            emitWorkspaceJoined(user_id, workspaceResult.rows[0]);
        }

        emitWorkspaceInviteResponse(inviteDetails.invited_by_id, {
            workspaceId: workspace_id,
            workspaceName: inviteDetails.workspace_name,
            action: "accepted",
            invitedUserId: user_id,
            invitedUserName: inviteDetails.invited_user_name,
            invitedUserEmail: inviteDetails.invited_user_email,
        });

        return res.status(200).json({
            message: "Invite accepted successfully",
            workspace: workspaceResult.rows[0] ?? null,
        });
    } catch (e) {
        const err = e as Error;
        return res.status(500).json({ message: err.message });
    }
}

export const rejectInvite = async (req: Request<{}, {}, { workspace_id: string }>, res: Response): Promise<Response | void> => {
    try {
        const workspace_id = req.body.workspace_id;
        const user_id = req.user?.id;

        if (!workspace_id || !user_id) return res.status(400).json({ message: "Missing required fields" });

        const inviteCheck = await pool.query<InviteDetails>(
            `SELECT
                wi.id,
                wi.workspace_id,
                wi.invited_by_id,
                wi.invited_user_id,
                w.name AS workspace_name,
                u.name AS invited_user_name,
                u.email AS invited_user_email
             FROM workspace_invites wi
             JOIN workspaces w ON w.id = wi.workspace_id
             JOIN users u ON u.id = wi.invited_user_id
             WHERE wi.workspace_id = $1 AND wi.invited_user_id = $2 AND wi.status = 'pending'
             LIMIT 1`,
            [workspace_id, user_id]
        );

        if (inviteCheck.rowCount === 0) {
            return res.status(404).json({ message: "No pending invite found" });
        }
        const inviteDetails = inviteCheck.rows[0];

        await pool.query(
            "DELETE FROM workspace_invites WHERE id = $1 AND status = 'pending'",
            [inviteDetails.id]
        );

        emitWorkspaceInviteResponse(inviteDetails.invited_by_id, {
            workspaceId: workspace_id,
            workspaceName: inviteDetails.workspace_name,
            action: "rejected",
            invitedUserId: user_id,
            invitedUserName: inviteDetails.invited_user_name,
            invitedUserEmail: inviteDetails.invited_user_email,
        });

        return res.status(200).json({ message: "Invite rejected" });
    } catch (e) {
        const err = e as Error;
        return res.status(500).json({ message: err.message });
    }
}

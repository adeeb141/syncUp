import { getClients } from ".";
import { pool } from "../config/DB_connect";


 //Broadcast to all online members of a workspace
async function broadcastToWorkspace(workspaceId: string, payload: object) {
    const clients = getClients();

    const members = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM workspace_members WHERE workspace_id = $1`,
        [workspaceId]
    );

    for (const row of members.rows) {
        const socket = clients.get(row.user_id);
        if (socket && socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }
}

 //Send a message to a single user (if online).

function sendToUser(userId: string, payload: object) {
    const clients = getClients();
    const socket = clients.get(userId);
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}
export async function emitTaskUpdated(workspaceId: string, task: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "TASK_UPDATED",
        category:"sync",
        task,
    });
}

export async function emitTaskDeleted(workspaceId: string, taskId: string) {
    await broadcastToWorkspace(workspaceId, {
        type: "TASK_DELETED",
        category:"sync",
        taskId,
    });
}

export function emitTaskAssigned(assigneeId: string, task: object) {
    sendToUser(assigneeId, {
        type: "TASK_ASSIGNED",
        category:"sync",
        task,
    });
}

export async function emitProjectAdded(workspaceId: string, project: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "PROJECT_ADDED",
        category:"sync",
        project,
    });
}

export async function emitProjectDeleted(workspaceId: string, projectId: string) {
    await broadcastToWorkspace(workspaceId, {
        type: "PROJECT_DELETED",
        category:"sync",
        projectId,
    });
}

export async function emitWorkspaceDeleted(workspaceId: string) {
    await broadcastToWorkspace(workspaceId, {
        type: "WORKSPACE_DELETED",
        category: "sync",
        workspaceId,
    });
}

export async function emitMemberAdded(workspaceId: string, member: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "MEMBER_ADDED",
        category: "sync",
        member,
    });
}

export async function emitMemberRemoved(workspaceId: string, userId: string) {
    await broadcastToWorkspace(workspaceId, {
        type: "MEMBER_REMOVED",
        category: "sync",
        userId,
    });
}

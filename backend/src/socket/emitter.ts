import { getClients } from ".";
import { pool } from "../config/DB_connect";

const WS_OPEN_STATE = 1;
const isSocketOpen = (socket: { readyState: number }) => socket.readyState === WS_OPEN_STATE;

 //Broadcast to all online members of a workspace
async function broadcastToWorkspace(workspaceId: string, payload: object) {
    const clients = getClients();

    const members = await pool.query<{ user_id: string }>(
        `SELECT user_id FROM workspace_members WHERE workspace_id = $1`,
        [workspaceId]
    );

    for (const row of members.rows) {
        const sockets = clients.get(row.user_id);
        if (!sockets) continue;

        for (const socket of sockets) {
            if (isSocketOpen(socket)) {
                socket.send(JSON.stringify(payload));
            }
        }
    }
}

 //Send a message to a single user (if online).

function sendToUser(userId: string, payload: object) {
    const clients = getClients();
    const sockets = clients.get(userId);
    if (!sockets) return;

    for (const socket of sockets) {
        if (isSocketOpen(socket)) {
            socket.send(JSON.stringify(payload));
        }
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

export function emitTaskReviewRequested(creatorId: string, task: object, assigneeName: string) {
    sendToUser(creatorId, {
        type: "TASK_REVIEW_REQUESTED",
        category: "sync",
        task,
        assigneeName,
    });
}

export function emitTaskReviewResult(assigneeId: string, task: object, action: "approve" | "reject", remarks?: string) {
    sendToUser(assigneeId, {
        type: "TASK_REVIEW_RESULT",
        category: "sync",
        task,
        action,
        remarks: remarks ?? null,
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

export async function emitFileUploaded(workspaceId: string, file: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "FILE_UPLOADED",
        category: "sync",
        file,
    });
}

export async function emitFileDeleted(
    workspaceId: string,
    payload: {
        fileId: string;
        workspace_id: string;
        project_id: string | null;
        task_id: string | null;
    }
) {
    await broadcastToWorkspace(workspaceId, {
        type: "FILE_DELETED",
        category: "sync",
        ...payload,
    });
}

export async function emitDocumentCreated(workspaceId: string, document: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "DOCUMENT_CREATED",
        category: "sync",
        document,
    });
}

export async function emitWorkspaceDeleted(workspaceId: string, memberIds?: string[]) {
    const payload = {
        type: "WORKSPACE_DELETED",
        category: "sync",
        workspaceId,
    };

    if (memberIds && memberIds.length > 0) {
        const uniqueMemberIds = new Set(memberIds);
        for (const memberId of uniqueMemberIds) {
            sendToUser(memberId, payload);
        }
        return;
    }

    await broadcastToWorkspace(workspaceId, payload);
}

export async function emitMemberAdded(workspaceId: string, member: object) {
    await broadcastToWorkspace(workspaceId, {
        type: "MEMBER_ADDED",
        category: "sync",
        member,
    });
}

export async function emitMemberRemoved(workspaceId: string, userId: string) {
    const payload = {
        type: "MEMBER_REMOVED",
        category: "sync",
        workspaceId,
        userId,
    };
    await broadcastToWorkspace(workspaceId, payload);
    sendToUser(userId, payload);
}

export function emitWorkspaceJoined(userId: string, workspace: object) {
    sendToUser(userId, {
        type: "WORKSPACE_JOINED",
        category: "sync",
        workspace,
    });
}

export function emitWorkspaceInviteResponse(
    inviterId: string,
    payload: {
        workspaceId: string;
        workspaceName: string;
        action: "accepted" | "rejected";
        invitedUserId: string;
        invitedUserName: string;
        invitedUserEmail: string;
    }
) {
    sendToUser(inviterId, {
        type: "WORKSPACE_INVITE_RESPONSE",
        category: "invite",
        payload,
    });
}

export function emitWorkspaceInvite(
    invitedUserId: string,
    payload: {
        id: string;
        workspace_id: string;
        workspace_name: string;
        invited_by_name: string;
        invited_by_email: string;
    }
) {
    sendToUser(invitedUserId, {
        type: "workspace_invite",
        category: "invite",
        payload,
    });
}

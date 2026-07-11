// "use client"
// import { useAuthStore } from "@/stores/authStore";
// import { useEffect } from "react";
// import { useNotificationStore } from "@/stores/notificationStore";
// import { useWorkspaceStore } from "@/stores/workspaceStore";
// import { useMemberStore } from "@/stores/memberStore";
// import { useProjectStore } from "@/stores/projectStore";
// import { useTaskStore } from "@/stores/taskStore";
// import { WebsocketServerMessages } from "@/types";

// export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
//     const userId = useAuthStore((store) => store.user?.id);
//     const { pushNotification } = useNotificationStore();
//     useEffect(() => {
//         if (!userId) return;

//         const ws = new WebSocket('ws://localhost:5000');

//         ws.onopen = () => {
//             ws.send(JSON.stringify({
//                 type: "REGISTER",
//                 userId
//             }));
//         };

//         ws.onmessage = (event) => {
//             const message = JSON.parse(event.data) as WebsocketServerMessages;
//             window.dispatchEvent(new CustomEvent("syncup:ws-message", { detail: message }));
//             if (message.category === "notification") {
//                 pushNotification({
//                     id: crypto.randomUUID(),
//                     type: message.type,
//                     message: message.payload.message
//                 });
//             } else if (message.category === "invite") {
//                 const notificationStore = useNotificationStore.getState();

//                 if (message.type === "PENDING_INVITES") {
//                     notificationStore.setInvites(message.invites);
//                 } else if (message.type === "workspace_invite") {
//                     notificationStore.addInvite({
//                         id: message.payload.id,
//                         workspace_id: message.payload.workspace_id,
//                         workspace_name: message.payload.workspace_name,
//                         invited_by_name: message.payload.invited_by_name,
//                         invited_by_email: message.payload.invited_by_email
//                     });
//                     pushNotification({
//                         id: crypto.randomUUID(),
//                         type: "info",
//                         message: "You have a new workspace invitation!"
//                     });
//                 } else if (message.type === "WORKSPACE_INVITE_RESPONSE") {
//                     const action = message.payload.action === "accepted" ? "accepted" : "rejected";
//                     pushNotification({
//                         id: crypto.randomUUID(),
//                         type: action === "accepted" ? "success" : "warning",
//                         message: `${message.payload.invitedUserName} ${action} your invite to ${message.payload.workspaceName}.`
//                     });
//                 }
//             } else if (message.category === "sync") {
//                 const taskStore = useTaskStore.getState();
//                 const projectStore = useProjectStore.getState();
//                 const memberStore = useMemberStore.getState();
//                 const workspaceStore = useWorkspaceStore.getState();

//                 switch (message.type) {
//                     case "TASK_UPDATED":
//                         taskStore.updateTask(message.task.id, message.task);
//                         break;
//                     case "TASK_DELETED":
//                         taskStore.removeTask(message.taskId);
//                         break;
//                     case "TASK_ASSIGNED":
//                         if (taskStore.tasks.some(t => t.id === message.task.id)) {
//                             taskStore.updateTask(message.task.id, message.task);
//                         } else {
//                             taskStore.addTask(message.task);
//                         }
//                         pushNotification({
//                             id: crypto.randomUUID(),
//                             type: "info",
//                             message: `A task was assigned to you: "${message.task?.title ?? "Untitled task"}"`
//                         });
//                         break;
//                     case "TASK_REVIEW_REQUESTED":
//                         if (taskStore.tasks.some(t => t.id === message.task.id)) {
//                             taskStore.updateTask(message.task.id, message.task);
//                         }
//                         pushNotification({
//                             id: crypto.randomUUID(),
//                             type: "info",
//                             message: `${message.assigneeName ?? "Someone"} has requested review for task: "${message.task.title}"`
//                         });
//                         break;
//                     case "TASK_REVIEW_RESULT":
//                         if (taskStore.tasks.some(t => t.id === message.task.id)) {
//                             taskStore.updateTask(message.task.id, message.task);
//                         }
//                         if (message.action === "approve") {
//                             pushNotification({
//                                 id: crypto.randomUUID(),
//                                 type: "success",
//                                 message: `Your task "${message.task.title}" has been approved!`
//                             });
//                         } else {
//                             pushNotification({
//                                 id: crypto.randomUUID(),
//                                 type: "warning",
//                                 message: `Your task "${message.task.title}" was sent back for revision${message.remarks ? `: ${message.remarks}` : ""}`
//                             });
//                         }
//                         break;
//                     case "PROJECT_ADDED":
//                         console.log("WS message PROJECT_ADDED: ", message);
//                         if (message.project) {
//                             projectStore.addProject(message.project);
//                         } else {
//                             console.error("WS error: PROJECT_ADDED missing project payload", message);
//                         }
//                         break;
//                     case "PROJECT_DELETED":
//                         projectStore.removeProject(message.projectId);
//                         break;
//                     case "FILE_UPLOADED":
//                         pushNotification({
//                             id: crypto.randomUUID(),
//                             type: "info",
//                             message: `New file uploaded: "${message.file?.name ?? "Unnamed file"}"`
//                         });
//                         break;
//                     case "FILE_DELETED":
//                         pushNotification({
//                             id: crypto.randomUUID(),
//                             type: "warning",
//                             message: "A file was deleted."
//                         });
//                         break;
//                     case "DOCUMENT_CREATED":
//                         pushNotification({
//                             id: crypto.randomUUID(),
//                             type: "info",
//                             message: `New document created: "${message.document?.name ?? "Untitled document"}"`
//                         });
//                         break;
//                     case "WORKSPACE_DELETED":
//                         workspaceStore.setWorkspaces(
//                             workspaceStore.workspaces.filter(w => w.workspace_id !== message.workspaceId)
//                         );
//                         break;
//                     case "WORKSPACE_UPDATED":
//                         if (!message.workspaceId || !message.workspace) {
//                             break;
//                         }
//                         workspaceStore.setWorkspaces(
//                             workspaceStore.workspaces.map((workspace) =>
//                                 workspace.workspace_id === message.workspaceId
//                                     ? { ...workspace, ...message.workspace, workspace_id: message.workspaceId }
//                                     : workspace
//                             )
//                         );
//                         break;
//                     case "WORKSPACE_JOINED": {
//                         if (!message.workspace) break;
//                         if (workspaceStore.workspaces.some((w) => w.workspace_id === message.workspace.workspace_id)) {
//                             break;
//                         }
//                         workspaceStore.setWorkspaces([...workspaceStore.workspaces, message.workspace]);
//                         break;
//                     }
//                     case "MEMBER_ADDED":
//                         memberStore.addMember(message.member);
//                         break;
//                     case "MEMBER_REMOVED":
//                         memberStore.removeMember(message.userId, message.workspaceId);
//                         if (String(message.userId) === String(userId)) {
//                             window.location.href = "/workspaces";
//                         }
//                         break;
//                 }
//             }
//         };

//         ws.onclose = () => {};

//         return () => {
//             ws.close();
//         };
//     }, [userId, pushNotification]);

//     return <>{children}</>;
// };








"use client"
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useMemberStore } from "@/stores/memberStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { WebsocketServerMessages } from "@/types";
import { setSocket } from "@/lib/wsConnection";

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const userId = useAuthStore((store) => store.user?.id);
    const { pushNotification } = useNotificationStore();
    useEffect(() => {
        if (!userId) return;

        //const ws = new WebSocket('ws://localhost:5000');
         const WS_URL =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:5000";

    const ws = new WebSocket(WS_URL);


        ws.onopen = () => {
            setSocket(ws);
            ws.send(JSON.stringify({
                type: "REGISTER",
                userId
            }));
            window.dispatchEvent(new CustomEvent("syncup:ws-open"));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data) as WebsocketServerMessages;
            window.dispatchEvent(new CustomEvent("syncup:ws-message", { detail: message }));
            if (message.category === "notification") {
                pushNotification({
                    id: crypto.randomUUID(),
                    type: message.type,
                    message: message.payload.message
                });
            } else if (message.category === "invite") {
                const notificationStore = useNotificationStore.getState();

                if (message.type === "PENDING_INVITES") {
                    notificationStore.setInvites(message.invites);
                } else if (message.type === "workspace_invite") {
                    notificationStore.addInvite({
                        id: message.payload.id,
                        workspace_id: message.payload.workspace_id,
                        workspace_name: message.payload.workspace_name,
                        invited_by_name: message.payload.invited_by_name,
                        invited_by_email: message.payload.invited_by_email
                    });
                    pushNotification({
                        id: crypto.randomUUID(),
                        type: "info",
                        message: "You have a new workspace invitation!"
                    });
                } else if (message.type === "WORKSPACE_INVITE_RESPONSE") {
                    const action = message.payload.action === "accepted" ? "accepted" : "rejected";
                    pushNotification({
                        id: crypto.randomUUID(),
                        type: action === "accepted" ? "success" : "warning",
                        message: `${message.payload.invitedUserName} ${action} your invite to ${message.payload.workspaceName}.`
                    });
                }
            } else if (message.category === "sync") {
                const taskStore = useTaskStore.getState();
                const projectStore = useProjectStore.getState();
                const memberStore = useMemberStore.getState();
                const workspaceStore = useWorkspaceStore.getState();

                switch (message.type) {
                    case "TASK_UPDATED":
                        taskStore.updateTask(message.task.id, message.task);
                        break;
                    case "TASK_DELETED":
                        taskStore.removeTask(message.taskId);
                        break;
                    case "TASK_ASSIGNED":
                        if (taskStore.tasks.some(t => t.id === message.task.id)) {
                            taskStore.updateTask(message.task.id, message.task);
                        } else {
                            taskStore.addTask(message.task);
                        }
                        pushNotification({
                            id: crypto.randomUUID(),
                            type: "info",
                            message: `A task was assigned to you: "${message.task?.title ?? "Untitled task"}"`
                        });
                        break;
                    case "TASK_REVIEW_REQUESTED":
                        if (taskStore.tasks.some(t => t.id === message.task.id)) {
                            taskStore.updateTask(message.task.id, message.task);
                        }
                        pushNotification({
                            id: crypto.randomUUID(),
                            type: "info",
                            message: `${message.assigneeName ?? "Someone"} has requested review for task: "${message.task.title}"`
                        });
                        break;
                    case "TASK_REVIEW_RESULT":
                        if (taskStore.tasks.some(t => t.id === message.task.id)) {
                            taskStore.updateTask(message.task.id, message.task);
                        }
                        if (message.action === "approve") {
                            pushNotification({
                                id: crypto.randomUUID(),
                                type: "success",
                                message: `Your task "${message.task.title}" has been approved!`
                            });
                        } else {
                            pushNotification({
                                id: crypto.randomUUID(),
                                type: "warning",
                                message: `Your task "${message.task.title}" was sent back for revision${message.remarks ? `: ${message.remarks}` : ""}`
                            });
                        }
                        break;
                    case "PROJECT_ADDED":
                        console.log("WS message PROJECT_ADDED: ", message);
                        if (message.project) {
                            projectStore.addProject(message.project);
                        } else {
                            console.error("WS error: PROJECT_ADDED missing project payload", message);
                        }
                        break;
                    case "PROJECT_DELETED":
                        projectStore.removeProject(message.projectId);
                        break;
                    case "FILE_UPLOADED":
                        pushNotification({
                            id: crypto.randomUUID(),
                            type: "info",
                            message: `New file uploaded: "${message.file?.name ?? "Unnamed file"}"`
                        });
                        break;
                    case "FILE_DELETED":
                        pushNotification({
                            id: crypto.randomUUID(),
                            type: "warning",
                            message: "A file was deleted."
                        });
                        break;
                    case "DOCUMENT_CREATED":
                        pushNotification({
                            id: crypto.randomUUID(),
                            type: "info",
                            message: `New document created: "${message.document?.name ?? "Untitled document"}"`
                        });
                        break;
                    case "WORKSPACE_DELETED":
                        workspaceStore.setWorkspaces(
                            workspaceStore.workspaces.filter(w => w.workspace_id !== message.workspaceId)
                        );
                        break;
                    case "WORKSPACE_UPDATED":
                        if (!message.workspaceId || !message.workspace) {
                            break;
                        }
                        workspaceStore.setWorkspaces(
                            workspaceStore.workspaces.map((workspace) =>
                                workspace.workspace_id === message.workspaceId
                                    ? { ...workspace, ...message.workspace, workspace_id: message.workspaceId }
                                    : workspace
                            )
                        );
                        break;
                    case "WORKSPACE_JOINED": {
                        if (!message.workspace) break;
                        if (workspaceStore.workspaces.some((w) => w.workspace_id === message.workspace.workspace_id)) {
                            break;
                        }
                        workspaceStore.setWorkspaces([...workspaceStore.workspaces, message.workspace]);
                        break;
                    }
                    case "MEMBER_ADDED":
                        memberStore.addMember(message.member);
                        break;
                    case "MEMBER_REMOVED":
                        memberStore.removeMember(message.userId, message.workspaceId);
                        if (String(message.userId) === String(userId)) {
                            window.location.href = "/workspaces";
                        }
                        break;
                }
            }
        };

        ws.onclose = () => {
            setSocket(null);
            window.dispatchEvent(new CustomEvent("syncup:ws-close"));
        };

        return () => {
            ws.close();
        };
    }, [userId, pushNotification]);

    return <>{children}</>;
};
"use client"
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useMemberStore } from "@/stores/memberStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { WebsocketServerMessages } from "@/types";

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const userId = useAuthStore((store) => store.user?.id);
    const { pushNotification } = useNotificationStore();
    useEffect(() => {
        if (!userId) return;

        const ws = new WebSocket('ws://localhost:5000');

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: "REGISTER",
                userId
            }));
        };

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data) as WebsocketServerMessages;
            if (message.category === "notification") {
                pushNotification({
                    id: crypto.randomUUID(),
                    type: message.type,
                    message: message.payload.message
                });
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
                        break;
                    case "PROJECT_ADDED":
                        projectStore.addProject(message.project);
                        break;
                    case "PROJECT_DELETED":
                        projectStore.removeProject(message.projectId);
                        break;
                    case "WORKSPACE_DELETED":
                        workspaceStore.setWorkspaces(
                            workspaceStore.workspaces.filter(w => w.workspace_id !== message.workspaceId)
                        );
                        break;
                    case "MEMBER_ADDED":
                        memberStore.addMember(message.member);
                        break;
                    case "MEMBER_REMOVED":
                        memberStore.removeMember(message.userId);
                        break;
                }
            }
        };

        ws.onclose = () => {};

        return () => {
            ws.close();
        };
    }, [userId]);

    return <>{children}</>;
};
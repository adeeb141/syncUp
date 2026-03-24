"use client"
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
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
            }
        };

        ws.onclose = () => {};

        return () => {
            ws.close();
        };
    }, [userId]);

    return <>{children}</>;
};
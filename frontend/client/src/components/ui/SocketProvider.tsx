"use client"
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notificationStore";
import { WebsocketServerMessages } from "@/types";
export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const user = useAuthStore((store) => store.user);
    const { pushNotification } = useNotificationStore();
    useEffect(() => {
        if (!user) return;

        const ws = new WebSocket('ws://localhost:5000');

        ws.onopen = () => {
            console.log("Client Connected");
            ws.send(JSON.stringify({
                type: "REGISTER",
                userId: user.id
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
            console.log("Message from server:", message);
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected");
        };

        return () => {
            ws.close();
        };
    }, [user]);

    return <>{children}</>;
};
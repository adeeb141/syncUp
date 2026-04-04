import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

const clients = new Map<string, WebSocket>();

export function initSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === "REGISTER") {
        clients.set(message.userId, ws);
        console.log(`User ${message.userId} registered`);
      }
    });

    ws.on("close", () => {
      for (const [userId, socket] of clients.entries()) {
        if (socket === ws) {
          clients.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });
}

export function getClients() {
  return clients;
}
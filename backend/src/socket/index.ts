import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { Hocuspocus } from "@hocuspocus/server";
import { saveDocument, loadDocument } from "../utils/fileStorage";

const clients = new Map<string, WebSocket>();

const hocuspocus = new Hocuspocus({
  name: "syncUp-collaboration",
  async onStoreDocument({ documentName, document }) {
    await saveDocument(documentName, document);
  },
  async onLoadDocument({ documentName }) {
    return await loadDocument(documentName);
  },
});

export function initSocket(server: Server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, request) => {
    if (request.url && request.url.startsWith("/collaboration")) {
      console.log("New Hocuspocus connection", request.url);
      hocuspocus.handleConnection(ws, request);
      return;
    }

    console.log("New standard WebSocket connection", request.url);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "REGISTER") {
          clients.set(message.userId, ws);
          console.log(`User ${message.userId} registered`);
        }
      } catch (err) {
        console.error("Invalid message format:", err);
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
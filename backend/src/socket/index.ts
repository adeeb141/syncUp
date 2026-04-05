import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { Hocuspocus } from "@hocuspocus/server";
import { saveDocument, loadDocument } from "../utils/fileStorage";
import { pool } from "../config/DB_connect";

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

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === "REGISTER") {
          clients.set(message.userId, ws);
          console.log(`User ${message.userId} registered`);

          try {
            const pendingInvites = await pool.query(
              `SELECT i.id as invite_id, i.workspace_id, w.name as workspace_name, u.name as invited_by_name, u.email as invited_by_email 
               FROM workspace_invites i 
               JOIN workspaces w ON i.workspace_id = w.id 
               JOIN users u ON i.invited_by_id = u.id 
               WHERE i.invited_user_id = $1 AND i.status = 'pending'`,
              [message.userId]
            );

            if (pendingInvites.rowCount && pendingInvites.rowCount > 0 && ws.readyState === ws.OPEN) {
              ws.send(JSON.stringify({
                type: "PENDING_INVITES",
                category: "invite",
                invites: pendingInvites.rows.map(row => ({
                  id: row.invite_id,
                  workspace_id: row.workspace_id,
                  workspace_name: row.workspace_name,
                  invited_by_name: row.invited_by_name,
                  invited_by_email: row.invited_by_email
                }))
              }));
            }
          } catch (err) {
            console.error("Error fetching pending invites:", err);
          }
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
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { Hocuspocus } from "@hocuspocus/server";
import { saveDocument, loadDocument } from "../utils/fileStorage";
import { pool } from "../config/DB_connect";
import jwt from "jsonwebtoken";
import { canUserEditDocument, DocumentAccess } from "../utils/documentPermissions";

const clients = new Map<string, Set<WebSocket>>();

interface JwtPayload {
  id: string;
  email: string;
  is_verified: boolean;
  created_at: Date;
}

const getCookieValue = (cookieHeader: string | undefined, cookieName: string): string | null => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${cookieName}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(cookieName.length + 1));
};

const hocuspocus = new Hocuspocus({
  name: "syncUp-collaboration",
  async onAuthenticate({ documentName, requestHeaders, connectionConfig }) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const loginToken = getCookieValue(requestHeaders.cookie, "loginToken");
    if (!loginToken) {
      throw { reason: "Unauthorized" };
    }

    const payload = jwt.verify(loginToken, jwtSecret) as JwtPayload;
    const userId = payload.id;

    const docCheck = await pool.query(
      `SELECT
        d.id,
        d.access,
        d.created_by,
        d.workspace_id,
        EXISTS(
          SELECT 1
          FROM workspace_members wm
          WHERE wm.workspace_id = d.workspace_id AND wm.user_id = $2
        ) AS is_member,
        EXISTS(
          SELECT 1
          FROM document_collaborators dc
          WHERE dc.document_id = d.id AND dc.user_id = $2
        ) AS is_collaborator
       FROM documents d
       WHERE d.room_name = $1
       LIMIT 1`,
      [documentName, userId]
    );

    if (docCheck.rowCount === 0) {
      throw { reason: "Document not found" };
    }

    const doc = docCheck.rows[0] as {
      id: string;
      access: DocumentAccess;
      created_by: string;
      workspace_id: string;
      is_member: boolean;
      is_collaborator: boolean;
    };

    if (!doc.is_member) {
      throw { reason: "Forbidden" };
    }

    const canEdit = canUserEditDocument({
      access: doc.access,
      createdBy: doc.created_by,
      userId,
      isCollaborator: doc.is_collaborator,
    });

    connectionConfig.readOnly = !canEdit;

    return {
      userId,
      workspaceId: doc.workspace_id,
      documentId: doc.id,
      canEdit,
    };
  },
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
          if (!clients.has(message.userId)) {
            clients.set(message.userId, new Set<WebSocket>());
          }
          clients.get(message.userId)?.add(ws);
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

            if (pendingInvites.rowCount && pendingInvites.rowCount > 0 && ws.readyState === 1) {
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
      for (const [userId, sockets] of clients.entries()) {
        if (sockets.has(ws)) {
          sockets.delete(ws);
          if (sockets.size === 0) {
            clients.delete(userId);
          }
          console.log(`User ${userId} disconnected`);
        }
      }
    });
  });
}

export function getClients() {
  return clients;
}

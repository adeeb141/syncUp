import { WebSocket } from "ws";
import { huddleRoomManager } from "./roomManager";
import { HuddleClientMessage } from "./types";

function send(ws: WebSocket, obj: object): void {
  console.log("➡️ Sending:", obj);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  } else {
    console.log("❌ Socket not open:", ws.readyState);
  }
}

export function handleHuddleMessage(
  message: HuddleClientMessage,
  ws: WebSocket,
  connectionId: string
): void {
  console.log("====================================");
  console.log("📩 Backend received:", message.type);
  console.log("Connection:", connectionId);
  console.log("Message:", message);
  console.log("====================================");

  switch (message.type) {
    case "HUDDLE_JOIN": {
      console.log("🚀 HUDDLE_JOIN");
      console.log("Workspace:", message.workspaceId);
      console.log("User:", message.userId);

      const existingPeers = huddleRoomManager.join(
        message.workspaceId,
        connectionId,
        message.userId,
        ws,
        message.micOn,
        message.cameraOn
      );

      console.log("Existing peers:", existingPeers);

      const peersToNotify = huddleRoomManager.getPeersToNotify(
        message.workspaceId,
        connectionId
      );

      console.log("Peers to notify:", peersToNotify.length);

      console.log("➡️ Sending HUDDLE_PEERS");

      send(ws, {
        type: "HUDDLE_PEERS",
        workspaceId: message.workspaceId,
        peers: existingPeers,
      });

      for (const peer of peersToNotify) {
        console.log(
          "➡️ Notifying peer:",
          peer.connectionId,
          peer.userId
        );

        send(peer.ws, {
          type: "HUDDLE_PEER_JOINED",
          workspaceId: message.workspaceId,
          peer: {
            connectionId,
            userId: message.userId,
            micOn: message.micOn,
            cameraOn: message.cameraOn,
          },
        });
      }

      break;
    }

    case "HUDDLE_MEDIA_STATE": {
      console.log("🎛️ HUDDLE_MEDIA_STATE", message.micOn, message.cameraOn);
      const updated = huddleRoomManager.updateMediaState(connectionId, message.micOn, message.cameraOn);
      if (!updated) break;

      const workspaceId = huddleRoomManager.whichRoom(connectionId);
      if (!workspaceId) break;

      for (const peer of huddleRoomManager.getPeersToNotify(workspaceId, connectionId)) {
        send(peer.ws, {
          type: "HUDDLE_PEER_MEDIA_STATE",
          workspaceId,
          connectionId,
          micOn: message.micOn,
          cameraOn: message.cameraOn,
        });
      }

      break;
    }

    case "HUDDLE_LEAVE": {
      console.log("🚪 HUDDLE_LEAVE");
      handleHuddleDisconnect(connectionId);
      break;
    }

    case "SIGNAL_OFFER":
    case "SIGNAL_ANSWER":
    case "SIGNAL_ICE_CANDIDATE": {
      console.log("📡 Relay:", message.type);

      const target = huddleRoomManager.getConnection(
        message.workspaceId,
        message.targetConnectionId
      );

      if (!target) {
        console.log("❌ Target connection not found");
        break;
      }

      console.log("➡️ Relaying to:", message.targetConnectionId);

      send(target, {
        type: message.type,
        workspaceId: message.workspaceId,
        fromConnectionId: connectionId,
        payload: message.payload,
      });

      break;
    }

    default:
      console.log("⚠️ Unknown message:", message);
  }
}

/** Shared by explicit HUDDLE_LEAVE and abrupt ws disconnect */
export function handleHuddleDisconnect(
  connectionId: string
): void {
  console.log("Disconnect:", connectionId);

  const workspaceId = huddleRoomManager.whichRoom(connectionId);

  if (!workspaceId) {
    console.log("No workspace found");
    return;
  }

  const others = huddleRoomManager.getPeersToNotify(
    workspaceId,
    connectionId
  );

  huddleRoomManager.leave(connectionId);

  console.log("Notify remaining peers:", others.length);

  for (const peer of others) {
    send(peer.ws, {
      type: "HUDDLE_PEER_LEFT",
      workspaceId,
      connectionId,
    });
  }
}
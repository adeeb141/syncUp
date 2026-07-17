import { WebSocket } from "ws";
import { huddleRoomManager } from "./roomManager";
import { HuddleClientMessage } from "./types";

function send(ws: WebSocket, obj: object): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

export function handleHuddleMessage(message: HuddleClientMessage, ws: WebSocket, connectionId: string): void {
  switch (message.type) {
    case "HUDDLE_JOIN": {
      const existingPeers = huddleRoomManager.join(message.workspaceId, connectionId, message.userId, ws);

      // Tell the new joiner who's already here.
      send(ws, { type: "HUDDLE_PEERS", workspaceId: message.workspaceId, peers: existingPeers });

      // Tell everyone already here that a new peer joined, so THEY can start
      // an offer toward the new joiner (mesh: every pair negotiates once).
      for (const peer of huddleRoomManager.getPeersToNotify(message.workspaceId, connectionId)) {
        send(peer.ws, {
          type: "HUDDLE_PEER_JOINED",
          workspaceId: message.workspaceId,
          peer: { connectionId, userId: message.userId },
        });
      }
      break;
    }

    case "HUDDLE_LEAVE": {
      handleHuddleDisconnect(connectionId);
      break;
    }

    case "SIGNAL_OFFER":
    case "SIGNAL_ANSWER":
    case "SIGNAL_ICE_CANDIDATE": {
      // Server relays blind — never inspects SDP/ICE content, just routes it
      // to exactly the one connection it's addressed to.
      const target = huddleRoomManager.getConnection(message.workspaceId, message.targetConnectionId);
      if (target) {
        send(target, {
          type: message.type,
          workspaceId: message.workspaceId,
          fromConnectionId: connectionId,
          payload: message.payload,
        });
      }
      break;
    }
  }
}

/** Shared by explicit HUDDLE_LEAVE and abrupt ws disconnect — same cleanup either way. */
export function handleHuddleDisconnect(connectionId: string): void {
  const workspaceId = huddleRoomManager.whichRoom(connectionId);
  if (!workspaceId) return;

  const others = huddleRoomManager.getPeersToNotify(workspaceId, connectionId);
  huddleRoomManager.leave(connectionId);

  for (const peer of others) {
    send(peer.ws, { type: "HUDDLE_PEER_LEFT", workspaceId, connectionId });
  }
}
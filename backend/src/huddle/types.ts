/**
 * Message shapes for WebRTC signaling, relayed through the existing plain
 * WebSocket connection (NOT through Hocuspocus, NOT through Redis yet — see
 * the scaling note in roomManager.ts).
 */

export interface HuddleJoinMessage {
  type: "HUDDLE_JOIN";
  workspaceId: string;
  userId: string;
  micOn: boolean;
  cameraOn: boolean;
}

export interface HuddleLeaveMessage {
  type: "HUDDLE_LEAVE";
  workspaceId: string;
}

/** Sent whenever a participant toggles mute/camera after already joining. */
export interface HuddleMediaStateMessage {
  type: "HUDDLE_MEDIA_STATE";
  workspaceId: string;
  micOn: boolean;
  cameraOn: boolean;
}

/** One entry describing a peer already in the room, sent to a new joiner. */
export interface HuddlePeerInfo {
  connectionId: string;
  userId: string;
  micOn: boolean;
  cameraOn: boolean;
}

export interface SignalMessage {
  type: "SIGNAL_OFFER" | "SIGNAL_ANSWER" | "SIGNAL_ICE_CANDIDATE";
  workspaceId: string;
  targetConnectionId: string; // exactly ONE peer connection, never a broadcast
  payload: unknown; // SDP or ICE candidate — server never inspects this
}

export type HuddleClientMessage = HuddleJoinMessage | HuddleLeaveMessage | HuddleMediaStateMessage | SignalMessage;
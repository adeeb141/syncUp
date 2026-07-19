export interface HuddlePeerInfo {
  connectionId: string;
  userId: string;
  micOn: boolean;
  cameraOn: boolean;
}

/** Messages the SERVER sends, arriving via the existing "syncup:ws-message" window event. */
export type HuddleServerMessage =
  | { type: "HUDDLE_PEERS"; workspaceId: string; peers: HuddlePeerInfo[] }
  | { type: "HUDDLE_PEER_JOINED"; workspaceId: string; peer: HuddlePeerInfo }
  | { type: "HUDDLE_PEER_LEFT"; workspaceId: string; connectionId: string }
  | { type: "HUDDLE_PEER_MEDIA_STATE"; workspaceId: string; connectionId: string; micOn: boolean; cameraOn: boolean }
  | { type: "SIGNAL_OFFER"; workspaceId: string; fromConnectionId: string; payload: RTCSessionDescriptionInit }
  | { type: "SIGNAL_ANSWER"; workspaceId: string; fromConnectionId: string; payload: RTCSessionDescriptionInit }
  | { type: "SIGNAL_ICE_CANDIDATE"; workspaceId: string; fromConnectionId: string; payload: RTCIceCandidateInit };

export interface HuddleParticipant {
  connectionId: string;
  userId: string;
  stream: MediaStream | null; // null until their track actually arrives
  micOn: boolean;
  cameraOn: boolean;
}
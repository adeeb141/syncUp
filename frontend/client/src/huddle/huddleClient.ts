/**
 * Mesh WebRTC huddle client. One RTCPeerConnection per remote peer.
 *
 * Negotiation role (avoids "glare" — both sides offering at once):
 *   - Peers ALREADY in the room, when told about a NEW joiner, create the offer.
 *   - The NEW joiner only ever answers. It never initiates.
 * This is enforced just by which message triggers which action below —
 * HUDDLE_PEER_JOINED (you were already here) -> you offer.
 * HUDDLE_PEERS (you just joined) -> you wait for offers.
 *
 * ICE candidates can legitimately arrive before setRemoteDescription has run
 * (the offer/answer round trip takes a moment) — those are buffered per peer
 * and flushed once the remote description is actually set.
 */

import { getSocket } from "@/lib/wsConnection";
import { HuddleParticipant, HuddleServerMessage } from "./types";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  // Production needs a real TURN server too — public STUN alone fails for
  // roughly 15-20% of real-world network pairs (symmetric NAT, corporate
  // firewalls). Not needed for local/same-network testing; flagging so it's
  // a deliberate next step, not a surprise when someone's call doesn't connect.
];

interface PeerEntry {
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[]; // buffered until remote description is set
  remoteDescriptionSet: boolean;
}

export class HuddleClient {
  private peers = new Map<string, PeerEntry>(); // connectionId -> peer entry
  private localStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private messageHandler: (e: Event) => void;
  private joined = false;

  constructor(
    private workspaceId: string,
    private userId: string,
    private onParticipantsChange: (participants: HuddleParticipant[]) => void,
    private onLocalStreamReady: (stream: MediaStream) => void
  ) {
    this.messageHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as HuddleServerMessage;
      if (!detail?.type?.startsWith?.("HUDDLE_") && !detail?.type?.startsWith?.("SIGNAL_")) return;
      if ("workspaceId" in detail && detail.workspaceId !== this.workspaceId) return;
      this.handleServerMessage(detail);
    };
    window.addEventListener("syncup:ws-message", this.messageHandler);
  }

  /** Call once: gets camera+mic, joins the huddle. Every participant gets a
   *  video transceiver from the start (even if camera starts off) — this is
   *  what lets screen share swap tracks later with NO renegotiation needed. */
  async join(): Promise<void> {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    this.cameraTrack = this.localStream.getVideoTracks()[0] ?? null;
    this.onLocalStreamReady(this.localStream);

    this.send({ type: "HUDDLE_JOIN", workspaceId: this.workspaceId, userId: this.userId });
    this.joined = true;
  }

  leave(): void {
    if (this.joined) {
      this.send({ type: "HUDDLE_LEAVE", workspaceId: this.workspaceId });
    }
    for (const [, entry] of this.peers) entry.pc.close();
    this.peers.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.joined = false;
    this.emitParticipants();
  }

  destroy(): void {
    this.leave();
    window.removeEventListener("syncup:ws-message", this.messageHandler);
  }

  toggleMic(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }

  toggleCamera(enabled: boolean): void {
    if (this.cameraTrack) this.cameraTrack.enabled = enabled;
  }

  /** Screen share: swaps the outgoing video track on every existing peer
   *  connection. No renegotiation needed because every peer already has a
   *  video transceiver from join() — replaceTrack is enough. */
  async startScreenShare(): Promise<void> {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = displayStream.getVideoTracks()[0];
    this.screenTrack = track;

    for (const [, entry] of this.peers) {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      await sender?.replaceTrack(track);
    }

    // Browser's native "Stop sharing" button — auto-revert to camera.
    track.onended = () => void this.stopScreenShare();
  }

  async stopScreenShare(): Promise<void> {
    if (!this.screenTrack) return;
    this.screenTrack.stop();
    this.screenTrack = null;

    for (const [, entry] of this.peers) {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      if (this.cameraTrack) await sender?.replaceTrack(this.cameraTrack);
    }
  }

  private send(message: object): void {
    const socket = getSocket();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private createPeerConnection(remoteConnectionId: string): PeerEntry {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { pc, pendingCandidates: [], remoteDescriptionSet: false };
    this.peers.set(remoteConnectionId, entry);

    // Always attach both audio and (possibly disabled) video tracks up front —
    // this is the transceiver every participant needs for screen share later.
    this.localStream?.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: "SIGNAL_ICE_CANDIDATE",
          workspaceId: this.workspaceId,
          targetConnectionId: remoteConnectionId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    // pc.ontrack = (event) => {
    //   this.updateParticipantStream(remoteConnectionId, event.streams[0] ?? null);
    // };

    pc.ontrack = (event) => {
  console.log(
    "ontrack",
    remoteConnectionId,
    event.track.kind,
    event.streams
  );

  this.updateParticipantStream(
    remoteConnectionId,
    event.streams[0] ?? null
  );
};

    // Edge case: peer disconnects mid-call without a clean HUDDLE_LEAVE
    // (network drop, tab crash) — clean up once ICE confirms it's actually gone.
    // pc.oniceconnectionstatechange = () => {
    //   if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
    //     this.removePeer(remoteConnectionId);
    //   }
    // };

    pc.oniceconnectionstatechange = () => {
  console.log(
    "ICE:",
    remoteConnectionId,
    pc.iceConnectionState
  );

  if (
    pc.iceConnectionState === "disconnected" ||
    pc.iceConnectionState === "failed"
  ) {
    this.removePeer(remoteConnectionId);
  }
};
  pc.onconnectionstatechange = () => {
    console.log(
      "Connection:",
      remoteConnectionId,
      pc.connectionState
    );
  };

    return entry;
  }

  private async handleServerMessage(message: HuddleServerMessage): Promise<void> {
    switch (message.type) {
      case "HUDDLE_PEERS": {
        // We just joined — create a connection per existing peer, but WAIT
        // for their offer. We never initiate here (avoids glare).
        for (const peer of message.peers) {
          this.createPeerConnection(peer.connectionId);
          this.trackParticipant(peer.connectionId, peer.userId);
        }
        break;
      }

      case "HUDDLE_PEER_JOINED": {
        // Someone new arrived, and we were already here — WE initiate.
        const entry = this.createPeerConnection(message.peer.connectionId);
        this.trackParticipant(message.peer.connectionId, message.peer.userId);

        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        this.send({
          type: "SIGNAL_OFFER",
          workspaceId: this.workspaceId,
          targetConnectionId: message.peer.connectionId,
          payload: offer,
        });
        break;
      }

      case "HUDDLE_PEER_LEFT": {
        this.removePeer(message.connectionId);
        break;
      }

      case "SIGNAL_OFFER": {
        const entry = this.peers.get(message.fromConnectionId) ?? this.createPeerConnection(message.fromConnectionId);
        await entry.pc.setRemoteDescription(message.payload);
        entry.remoteDescriptionSet = true;
        await this.flushPendingCandidates(entry);

        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        this.send({
          type: "SIGNAL_ANSWER",
          workspaceId: this.workspaceId,
          targetConnectionId: message.fromConnectionId,
          payload: answer,
        });
        break;
      }

      case "SIGNAL_ANSWER": {
        const entry = this.peers.get(message.fromConnectionId);
        if (!entry) return;
        await entry.pc.setRemoteDescription(message.payload);
        entry.remoteDescriptionSet = true;
        await this.flushPendingCandidates(entry);
        break;
      }

      case "SIGNAL_ICE_CANDIDATE": {
        const entry = this.peers.get(message.fromConnectionId);
        if (!entry) return;
        if (entry.remoteDescriptionSet) {
          await entry.pc.addIceCandidate(message.payload);
        } else {
          entry.pendingCandidates.push(message.payload); // buffer — remote description isn't set yet
        }
        break;
      }
    }
  }

  private async flushPendingCandidates(entry: PeerEntry): Promise<void> {
    for (const candidate of entry.pendingCandidates) {
      await entry.pc.addIceCandidate(candidate);
    }
    entry.pendingCandidates = [];
  }

  private removePeer(connectionId: string): void {
    const entry = this.peers.get(connectionId);
    entry?.pc.close();
    this.peers.delete(connectionId);
    this.participants.delete(connectionId);
    this.emitParticipants();
  }

  private participants = new Map<string, HuddleParticipant>();

  private trackParticipant(connectionId: string, userId: string): void {
    this.participants.set(connectionId, { connectionId, userId, stream: null });
    this.emitParticipants();
  }

  private updateParticipantStream(connectionId: string, stream: MediaStream | null): void {
    const existing = this.participants.get(connectionId);
    if (existing) {
      this.participants.set(connectionId, { ...existing, stream });
      this.emitParticipants();
    }
  }

  private emitParticipants(): void {
    this.onParticipantsChange(Array.from(this.participants.values()));
  }
}
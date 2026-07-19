import type { WebSocket } from "ws";
import { HuddlePeerInfo } from "./types";

interface RoomEntry {
  ws: WebSocket;
  userId: string;
  micOn: boolean;
  cameraOn: boolean;
}

/**
 * Tracks which CONNECTIONS (not users) are currently in which workspace's
 * huddle. This is new — nothing else in the codebase needed per-connection
 * addressing before, since documents/whiteboard/notifications only ever
 * broadcast to everyone, never target one specific peer.
 *
 * SCALING NOTE: this is in-memory, single-server-instance only. If two
 * peers in the same huddle land on different server instances (once you
 * run more than one), this breaks — signaling would need to go through
 * Redis, the same way CRDT ops do, so any instance can relay to a
 * connection held by any other instance. Not needed yet since you're on
 * one instance; flagging so it's a deliberate future step, not a surprise.
 */
export class HuddleRoomManager {
  private rooms = new Map<string, Map<string, RoomEntry>>(); // workspaceId -> connectionId -> entry
  private connectionToRoom = new Map<string, string>(); // connectionId -> workspaceId, for O(1) disconnect lookup

  /** Adds a connection to a room. Returns who was ALREADY there (for HUDDLE_PEERS). */
  join(workspaceId: string, connectionId: string, userId: string, ws: WebSocket, micOn: boolean, cameraOn: boolean): HuddlePeerInfo[] {
    if (!this.rooms.has(workspaceId)) this.rooms.set(workspaceId, new Map());
    const room = this.rooms.get(workspaceId)!;

    const existingPeers: HuddlePeerInfo[] = Array.from(room.entries()).map(([cid, entry]) => ({
      connectionId: cid,
      userId: entry.userId,
      micOn: entry.micOn,
      cameraOn: entry.cameraOn,
    }));

    room.set(connectionId, { ws, userId, micOn, cameraOn });
    this.connectionToRoom.set(connectionId, workspaceId);
    return existingPeers;
  }

  /** Updates a connection's mic/camera flags after a toggle post-join. Returns false if not in a room. */
  updateMediaState(connectionId: string, micOn: boolean, cameraOn: boolean): boolean {
    const workspaceId = this.connectionToRoom.get(connectionId);
    if (!workspaceId) return false;
    const room = this.rooms.get(workspaceId);
    const entry = room?.get(connectionId);
    if (!entry) return false;
    entry.micOn = micOn;
    entry.cameraOn = cameraOn;
    return true;
  }

  /** Which room (if any) a connection is currently in. */
  whichRoom(connectionId: string): string | undefined {
    return this.connectionToRoom.get(connectionId);
  }

  /** Everyone else in the room right now (excluding the given connection), with their sockets. */
  getPeersToNotify(workspaceId: string, excludeConnectionId: string): Array<HuddlePeerInfo & { ws: WebSocket }> {
    const room = this.rooms.get(workspaceId);
    if (!room) return [];
    return Array.from(room.entries())
      .filter(([cid]) => cid !== excludeConnectionId)
      .map(([cid, entry]) => ({ connectionId: cid, userId: entry.userId, micOn: entry.micOn, cameraOn: entry.cameraOn, ws: entry.ws }));
  }

  /** The exact socket for one connection in one room — used to relay signaling to exactly one peer. */
  getConnection(workspaceId: string, connectionId: string): WebSocket | undefined {
    return this.rooms.get(workspaceId)?.get(connectionId)?.ws;
  }

  /** Removes a connection from whatever room it's in (join, explicit leave, or abrupt disconnect). */
  leave(connectionId: string): void {
    const workspaceId = this.connectionToRoom.get(connectionId);
    if (!workspaceId) return;
    const room = this.rooms.get(workspaceId);
    room?.delete(connectionId);
    if (room && room.size === 0) this.rooms.delete(workspaceId);
    this.connectionToRoom.delete(connectionId);
  }
}

export const huddleRoomManager = new HuddleRoomManager();
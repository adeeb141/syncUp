"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Users } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { HuddleClient } from "@/huddle/huddleClient";
import { HuddleParticipant } from "@/huddle/types";
import ParticipantTile from "./ParticipantTile";

interface Props {
  workspaceId: string;
  /**
   * Resolves a userId to a display name. Wire this to your existing member
   * store (e.g. useMemberStore) so tiles show real names instead of raw
   * ids — left as a prop rather than guessed at, since I don't have your
   * member store's exact field names in front of me. Falls back to a
   * shortened id if omitted.
   */
  getUserName?: (userId: string) => string;
}

export default function HuddleWidget({ workspaceId, getUserName }: Props) {
  const userId = useAuthStore((store) => store.user?.id);

  const [inHuddle, setInHuddle] = useState(false);
  const [participants, setParticipants] = useState<HuddleParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [spotlightId, setSpotlightId] = useState<string | null>(null); // null = grid view; "local" or a connectionId = big view

  const clientRef = useRef<HuddleClient | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoLargeRef = useRef<HTMLVideoElement | null>(null);

  const toggleSpotlight = (id: string) => {
    setSpotlightId((current) => (current === id ? null : id));
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localVideoLargeRef.current && localStream) {
      localVideoLargeRef.current.srcObject = localStream;
    }
  }, [localStream, spotlightId]);

  useEffect(() => {
    // Leave cleanly if the component unmounts (e.g. user navigates away) while still in a huddle.
    return () => {
      clientRef.current?.destroy();
    };
  }, []);

  const handleJoin = async () => {
    if (!userId) return;
    setJoining(true);
    try {
      const client = new HuddleClient(workspaceId, userId, setParticipants, setLocalStream);
      await client.join();
      clientRef.current = client;
      setInHuddle(true);
    } catch (err) {
      console.error("Failed to join huddle (camera/mic permission denied?):", err);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    clientRef.current?.destroy();
    clientRef.current = null;
    setInHuddle(false);
    setParticipants([]);
    setLocalStream(null);
    setSharingScreen(false);
    setSpotlightId(null);
  };

  const toggleMic = () => {
    const next = !micOn;
    clientRef.current?.toggleMic(next);
    setMicOn(next);
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    clientRef.current?.toggleCamera(next);
    setCameraOn(next);
  };

  const toggleScreenShare = async () => {
    if (sharingScreen) {
      await clientRef.current?.stopScreenShare();
      setSharingScreen(false);
    } else {
      try {
        await clientRef.current?.startScreenShare();
        setSharingScreen(true);
      } catch (err) {
        console.error("Screen share cancelled or failed:", err);
      }
    }
  };

  const nameFor = (id: string) => getUserName?.(id) ?? `${id.slice(0, 6)}…`;

  if (!inHuddle) {
    return (
      <button
        onClick={handleJoin}
        disabled={joining || !userId}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm hover:opacity-90 disabled:opacity-50"
      >
        <Users className="w-4 h-4" />
        {joining ? "Joining…" : "Join Huddle"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-4 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-on-surface">Huddle · {participants.length + 1} in call</h3>
      </div>

      {spotlightId ? (
        <div className="space-y-2">
          {/* Big spotlighted tile */}
          {spotlightId === "local" ? (
            <div
              onClick={() => toggleSpotlight("local")}
              className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container-high cursor-pointer"
            >
              {cameraOn ? (
                <video
                  ref={localVideoLargeRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                    Y
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50">
                <span className="text-xs font-medium text-white">You</span>
                {!micOn && <MicOff className="w-3 h-3 text-white" />}
              </div>
            </div>
          ) : (
            (() => {
              const spotlighted = participants.find((p) => p.connectionId === spotlightId);
              return spotlighted ? (
                <ParticipantTile
                  participant={spotlighted}
                  label={nameFor(spotlighted.userId)}
                  large
                  onClick={() => toggleSpotlight(spotlightId)}
                />
              ) : null;
            })()
          )}

          {/* Thumbnail strip — click any to swap the spotlight */}
          <div className="flex gap-2 overflow-x-auto">
            {spotlightId !== "local" && (
              <div className="w-28 shrink-0">
                <div
                  onClick={() => toggleSpotlight("local")}
                  className="relative aspect-video rounded-lg overflow-hidden bg-surface-container-high cursor-pointer hover:ring-2 hover:ring-primary/50"
                >
                  {cameraOn ? (
                    <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">Y</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {participants
              .filter((p) => p.connectionId !== spotlightId)
              .map((p) => (
                <div key={p.connectionId} className="w-28 shrink-0">
                  <ParticipantTile participant={p} label={nameFor(p.userId)} onClick={() => toggleSpotlight(p.connectionId)} />
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Local self-preview tile — click to spotlight yourself */}
          <div
            onClick={() => toggleSpotlight("local")}
            className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container-high cursor-pointer hover:ring-2 hover:ring-primary/50"
          >
            {cameraOn ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">Y</div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50">
              <span className="text-xs font-medium text-white">You</span>
              {!micOn && <MicOff className="w-3 h-3 text-white" />}
            </div>
          </div>

          {participants.map((p) => (
            <ParticipantTile key={p.connectionId} participant={p} label={nameFor(p.userId)} onClick={() => toggleSpotlight(p.connectionId)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          onClick={toggleMic}
          className={`p-2.5 rounded-full ${micOn ? "bg-surface-container-high" : "bg-error-container text-error"}`}
          title={micOn ? "Mute" : "Unmute"}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-2.5 rounded-full ${cameraOn ? "bg-surface-container-high" : "bg-error-container text-error"}`}
          title={cameraOn ? "Turn camera off" : "Turn camera on"}
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleScreenShare}
          className={`p-2.5 rounded-full ${sharingScreen ? "bg-primary text-on-primary" : "bg-surface-container-high"}`}
          title={sharingScreen ? "Stop sharing" : "Share screen"}
        >
          {sharingScreen ? <ScreenShareOff className="w-4 h-4" /> : <ScreenShare className="w-4 h-4" />}
        </button>
 
        <button
          onClick={handleLeave}
          className="p-2.5 rounded-full bg-error text-on-error"
          title="Leave huddle"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
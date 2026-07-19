"use client";

import { useCallback } from "react";
import { MicOff } from "lucide-react";
import { HuddleParticipant } from "@/huddle/types";

interface Props {
  participant: HuddleParticipant;
  label: string; // display name — parent resolves userId -> name
  muted?: boolean; // true for the local self-preview tile, to avoid echo
  onClick?: () => void; // click-to-spotlight
  large?: boolean; // render as the big spotlighted tile
}

export default function ParticipantTile({ participant, label, muted, onClick, large }: Props) {
  const setVideoRef = useCallback(
    (video: HTMLVideoElement | null) => {
      if (video && participant.stream) {
        video.srcObject = participant.stream;
      }
    },
    [participant.stream]
  );

  // Show video only when they actually have BOTH a stream and their camera
  // on — a disabled sending track still arrives as a stream, just carrying a
  // black frame, so cameraOn (told to us via HUDDLE_PEER_MEDIA_STATE) is what
  // actually decides this, not stream presence alone.
  const showVideo = participant.stream && participant.cameraOn;

  return (
    <div
      onClick={onClick}
      className={`relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container-high ${
        onClick ? "cursor-pointer" : ""
      } ${large ? "" : "hover:ring-2 hover:ring-primary/50"}`}
    >
      {showVideo ? (
        <video ref={setVideoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className={`rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold ${large ? "w-20 h-20 text-2xl" : "w-12 h-12"}`}>
            {label.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50">
        <span className="text-xs font-medium text-white">{label}</span>
        {!participant.micOn && <MicOff className="w-3 h-3 text-white" />}
      </div>
    </div>
  );
}
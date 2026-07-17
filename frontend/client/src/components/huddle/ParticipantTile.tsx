"use client";

import { useCallback } from "react";
import { MicOff } from "lucide-react";
import { HuddleParticipant } from "@/huddle/types";

interface Props {
  participant: HuddleParticipant;
  label: string; // display name — parent resolves userId -> name
  muted?: boolean; // true for the local self-preview tile, to avoid echo
  isMicOff?: boolean;
}

export default function ParticipantTile({ participant, label, muted, isMicOff }: Props) {
  const setVideoRef = useCallback(
    (video: HTMLVideoElement | null) => {
      if (video && participant.stream) {
        video.srcObject = participant.stream;
      }
    },
    [participant.stream]
  );

  return (
    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-surface-container-high">
      {participant.stream ? (
        <video ref={setVideoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {label.slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50">
        <span className="text-xs font-medium text-white">{label}</span>
        {isMicOff && <MicOff className="w-3 h-3 text-white" />}
      </div>
    </div>
  );
}
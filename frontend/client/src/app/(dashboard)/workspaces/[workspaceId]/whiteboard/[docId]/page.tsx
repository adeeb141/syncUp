"use client";

import { useParams, useSearchParams } from "next/navigation";
import Whiteboard from "@/components/Whiteboard";

export default function WhiteboardPage() {
  const { workspaceId, docId } = useParams();
  const searchParams = useSearchParams();

  const roomName = searchParams.get("room") || "";
  const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  const docIdStr = Array.isArray(docId) ? docId[0] : docId;

  if (!roomName) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant">error</span>
          <p className="text-on-surface font-bold">Missing room information</p>
          <p className="text-on-surface-variant text-sm">This whiteboard link appears to be invalid.</p>
        </div>
      </div>
    );
  }

  return <Whiteboard roomName={roomName} workspaceId={workspaceIdStr} documentId={docIdStr} />;
}
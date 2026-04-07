"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

// This page is no longer used — documents are created via the modal.
// Redirect back to the workspace page.
export default function NewDocRedirect() {
  const router = useRouter();
  const { workspaceId } = useParams();
  const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  useEffect(() => {
    router.replace(`/workspaces/${wsId}`);
  }, [wsId, router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <p className="text-on-surface-variant text-sm">Redirecting...</p>
    </div>
  );
}
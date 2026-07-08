"use client";

import { useParams } from "next/navigation";
import CrdtDemoEditor from "@/components/CrdtDemoEditor";

export default function CrdtDemoPage() {
  const { workspaceId, docId } = useParams();
  const workspaceIdStr = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  const docIdStr = Array.isArray(docId) ? docId[0] : docId;

  if (!workspaceIdStr || !docIdStr) {
    return (
      <div className="p-6 text-sm text-on-surface-variant">
        Missing workspaceId or docId in the URL.
      </div>
    );
  }

  return <CrdtDemoEditor workspaceId={workspaceIdStr} docId={docIdStr} />;
}
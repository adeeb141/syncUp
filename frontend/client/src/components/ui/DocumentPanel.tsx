"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";

interface DocumentRecord {
  id: string;
  name: string;
  description: string;
  access: "view_only" | "open_collab" | "selective";
  workspace_id: string;
  project_id: string | null;
  task_id: string | null;
  room_name: string;
  created_by: string;
  creator_name: string | null;
  created_at: string;
}

interface DocumentPanelProps {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
}

const ACCESS_BADGE: Record<string, { label: string; icon: string; color: string }> = {
  open_collab: { label: "Open", icon: "group", color: "bg-secondary-container/30 text-secondary" },
  view_only: { label: "View Only", icon: "visibility", color: "bg-surface-container-high text-on-surface-variant" },
  selective: { label: "Selective", icon: "lock", color: "bg-tertiary-container/30 text-tertiary" },
};

export function DocumentPanel({ workspaceId, projectId, taskId }: DocumentPanelProps) {
  const router = useRouter();
  const params = useParams();
  const wsId = Array.isArray(params.workspaceId) ? params.workspaceId[0] : params.workspaceId;

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDocs = async () => {
      setLoading(true);
      setError(null);
      try {
        let endpoint = `/api/documents/${workspaceId}`;
        const queryParts: string[] = [];
        if (projectId) queryParts.push(`project_id=${projectId}`);
        if (taskId) queryParts.push(`task_id=${taskId}`);
        if (queryParts.length > 0) endpoint += `?${queryParts.join("&")}`;

        const data = await api.get<{ documents: DocumentRecord[] }>(endpoint);
        if (!cancelled) setDocuments(data.documents);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load documents");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDocs();
    return () => { cancelled = true; };
  }, [workspaceId, projectId, taskId]);

  const openDocument = (doc: DocumentRecord) => {
    router.push(
      `/workspaces/${wsId || workspaceId}/doc/${doc.id}?room=${encodeURIComponent(doc.room_name)}`
    );
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-outline text-base"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          description
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          Documents
        </span>
        {documents.length > 0 && (
          <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {documents.length}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-surface-container-low rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-error-container/20 border border-error/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="text-xs text-error font-medium flex-1">{error}</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && documents.length === 0 && (
        <p className="text-xs text-outline text-center py-3">No documents yet.</p>
      )}

      {/* Document List */}
      {!loading && !error && documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc) => {
            const badge = ACCESS_BADGE[doc.access] || ACCESS_BADGE.open_collab;
            return (
              <button
                key={doc.id}
                onClick={() => openDocument(doc)}
                className="w-full text-left group flex items-start gap-3 p-3 rounded-xl border border-outline-variant/10 hover:border-primary/25 hover:bg-surface-container-low transition-all"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors mt-0.5">
                  <span
                    className="material-symbols-outlined text-primary text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    article
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                      {doc.name}
                    </p>
                    <span className={`${badge.color} text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-0.5`}>
                      <span className="material-symbols-outlined" style={{ fontSize: "10px" }}>{badge.icon}</span>
                      {badge.label}
                    </span>
                  </div>

                  {doc.description && (
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 mb-1">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[10px] text-outline">
                    {doc.creator_name && (
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined" style={{ fontSize: "11px" }}>person</span>
                        {doc.creator_name}
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <span className="material-symbols-outlined text-outline text-sm opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                  arrow_forward
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

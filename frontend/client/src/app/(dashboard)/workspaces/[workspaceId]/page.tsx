"use client";
import { useParams } from "next/navigation";
import { workspace_member, project } from "@/types";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

interface ApiResponse {
  workspaceMembers: workspace_member[];
  workspaceProjects: project[];
}

export default function WorkspaceIdPage() {
  const { workspaceId } = useParams();
  const workspaceIdParam = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;
  const [workspaceMembers, setWorkspaceMembers] = useState<workspace_member[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<project[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showMembers, setShowMembers] = useState(false);

  useEffect(() => {
    if (!workspaceIdParam) {
      return;
    }

    const fetchWorkspaceInfo = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<ApiResponse>(`/api/workspaces/${workspaceIdParam}/getinfo`);
        setWorkspaceMembers(response.workspaceMembers);
        setWorkspaceProjects(response.workspaceProjects);
        setError(false);
      } catch (e) {
        console.log(e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaceInfo();
  }, [workspaceIdParam]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="animate-[fadeIn_0.4s_ease_both]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--surface-border)] pb-5">
        <h1 className="sync-title flex items-center gap-3 text-[1.65rem]">
          Projects
        </h1>
        <button
          className="sync-btn-secondary flex items-center gap-2 rounded-xl px-4 py-2 text-[0.8rem] font-semibold"
          onClick={() => setShowMembers((prev) => !prev)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--accent-solid)]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {showMembers ? "Hide Members" : "Display Members"}
        </button>
      </div>

      {error && (
        <div className="sync-card mb-6 rounded-2xl border border-[rgba(178,82,98,0.2)] bg-[rgba(178,82,98,0.08)] p-4 text-sm text-[color:#9f3e51]">
          Failed to load workspace data.
        </div>
      )}

      {showMembers && (
        <div className="sync-card mb-7 rounded-3xl p-6 animate-[fadeUp_0.45s_cubic-bezier(0.16,1,0.3,1)_0.05s_both]">
          <h2 className="sync-title mb-4 text-[1rem]">Workspace Members</h2>
          {workspaceMembers.length === 0 ? (
            <p className="text-sm text-[color:var(--text-muted)]">No members found for this workspace.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspaceMembers.map((member) => (
                <div key={`${member.workspace_id}-${member.user_id}`} className="rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] p-4">
                  <p className="truncate text-[0.9rem] font-semibold text-[color:var(--text-primary)]">
                    {member.name ?? member.user_id}
                  </p>
                  <p className="mt-1 text-[0.78rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                    {member.role}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {workspaceProjects.length === 0 ? (
        <div className="sync-card flex flex-col items-center justify-center gap-3 rounded-3xl p-12 text-center animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-soft)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--accent-solid)]/70">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="sync-title text-[1.1rem]">No active projects</h3>
          <p className="text-sm text-[color:var(--text-muted)]">There are currently no projects assigned to this workspace.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {workspaceProjects.map((projectItem, index) => (
            <Link
              key={projectItem.id}
              href={`/workspaces/${workspaceIdParam}/projects/${projectItem.id}`}
              className="sync-card group block rounded-3xl p-5 no-underline"
              style={{ animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${0.12 + index * 0.06}s both` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="sync-title truncate text-[1rem] transition-colors group-hover:text-[color:var(--accent-solid)]">
                  {projectItem.name}
                </h3>
                <span className="sync-badge border-[color:var(--surface-border)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]">
                  {projectItem.status}
                </span>
              </div>

              <p className="line-clamp-2 min-h-[2.6rem] text-[0.84rem] text-[color:var(--text-muted)]">
                {projectItem.description || "No description provided."}
              </p>

              <div className="my-4 h-px bg-[color:var(--surface-border)]" />

              <p className="text-xs text-[color:var(--text-muted)]">
                Created {new Date(projectItem.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

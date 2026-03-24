"use client";
import { useParams } from "next/navigation";
import { workspace_member, project } from "@/types";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

interface ApiResponse {
  workspaceMembers: workspace_member[];
  workspaceProjects: project[];
}

export default function WorkspaceIdPage() {
  const { workspaceId } = useParams();
  const [workspaceMembers, setWorkspaceMembers] = useState<workspace_member[]>([]);
  const [workspaceProjects, setWorkspaceProjects] = useState<project[]>([]);
  const [error, seterror] = useState(false);

  useEffect(() => {
    const fetchWorkspaceInfo = async () => {
      try {
        const fetch = await api.get(`/api/workspaces/${workspaceId}/getinfo`) as ApiResponse;
        const Members = fetch.workspaceMembers;
        const Projects = fetch.workspaceProjects;
        setWorkspaceMembers(Members);
        setWorkspaceProjects(Projects);
        console.log(Projects);
        
        seterror(false);
      } catch (e) {
        console.log(e);
        seterror(true);
      }
    };
    fetchWorkspaceInfo();
  }, []);

  return (
    <div className="animate-[fadeIn_0.4s_ease_both]">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--surface-border)] pb-5">
        <h1 className="sync-title flex items-center gap-3 text-[1.65rem]">
          Projects
        </h1>
        <button className="sync-btn-secondary flex items-center gap-2 rounded-xl px-4 py-2 text-[0.8rem] font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--accent-solid)]">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Manage Members
        </button>
      </div>

      <div className="sync-card flex flex-col items-center justify-center gap-3 rounded-3xl p-12 text-center animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--accent-soft)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--accent-solid)]/70">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="sync-title text-[1.1rem]">No active projects</h3>
        <p className="text-sm text-[color:var(--text-muted)]">There are currently no projects assigned to this workspace.</p>
        <button className="sync-link mt-4 text-[0.83rem] font-semibold">
          + Create a new project
        </button>
      </div>
    </div>
  );
}

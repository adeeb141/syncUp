"use client";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useState } from "react";
import Link from "next/link";
import { useProjectStore } from "@/stores/projectStore";
import { useMemberStore } from "@/stores/memberStore";
import { useAuthStore } from "@/stores/authStore";
import { CreateProjectModal } from "@/components/ui/modals/CreateProjectModal";

const PROJECT_COLORS = [
  "bg-tertiary-container/20 text-tertiary",
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-container text-primary",
  "bg-error-container/20 text-error",
];
const PROJECT_ICONS = [
  "design_services", "terminal", "folder", "analytics"
];

export default function ProjectsPage() {
  const { workspaceId } = useParams();
  const workspaceIdParam = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  const workspaceProjects = useProjectStore((s) => s.projects);
  const workspaceMembers = useMemberStore((s) => s.members);
  
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserRole = workspaceMembers.find(m => m.user_id === currentUserId)?.role;

  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const router = useRouter();

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    setDeletingProjectId(projectId);
    try {
      await api.delete(`/api/workspaces/projects/${projectId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to delete project");
    } finally {
      setDeletingProjectId(null);
    }
  };

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant font-bold mb-2">
            <Link href={`/workspaces/${workspaceIdParam}`} className="hover:text-primary transition-colors">Workspace</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Projects</span>
          </div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">All Projects</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Manage and view all projects within this workspace.</p>
        </div>
        <button
          onClick={() => setShowCreateProjectModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaceProjects.map((projectItem, index) => {
          const canDelete = currentUserRole === "admin" || currentUserRole === "owner" || projectItem.created_by === currentUserId;
          return (
          <div
            key={projectItem.id}
            onClick={() => router.push(`/workspaces/${workspaceIdParam}/projects/${projectItem.id}`)}
            className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/5 hover:shadow-md transition-shadow group relative cursor-pointer flex flex-col ${deletingProjectId === projectItem.id ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`}>
                <span className="material-symbols-outlined">{PROJECT_ICONS[index % PROJECT_ICONS.length]}</span>
              </div>
              {canDelete && (
                <button
                  onClick={(e) => handleDeleteProject(e, projectItem.id)}
                  className="w-8 h-8 flex flex-shrink-0 items-center justify-center bg-error-container/20 text-error rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error hover:text-white"
                  title="Delete project"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              )}
              <span className="bg-surface-container-high px-2 py-1 rounded text-[10px] font-bold uppercase text-on-surface-variant ml-auto">{projectItem.status}</span>
            </div>
            <h5 className="font-headline text-lg font-bold text-on-surface group-hover:text-primary transition-colors">{projectItem.name}</h5>
            <p className="text-on-surface-variant text-sm mt-2 flex-grow leading-relaxed">{projectItem.description || "No description provided."}</p>
          </div>
        )})}
        {workspaceProjects.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">No Projects Available</h3>
            <p className="text-on-surface-variant text-sm font-body mb-4">You have no projects in this workspace yet.</p>
          </div>
        )}
      </div>

      {showCreateProjectModal && workspaceIdParam && (
        <CreateProjectModal
          workspaceId={workspaceIdParam}
          onClose={() => setShowCreateProjectModal(false)}
        />
      )}
    </div>
  );
}
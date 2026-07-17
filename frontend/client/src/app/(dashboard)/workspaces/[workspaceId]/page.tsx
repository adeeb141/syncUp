"use client";
import { useParams, useRouter } from "next/navigation";
import { workspace_member, project } from "@/types";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ManageMembersModal } from "@/components/ui/modals/ManageMembersModal";
import { CreateProjectModal } from "@/components/ui/modals/CreateProjectModal";
import { CreateDocumentModal } from "@/components/ui/modals/CreateDocumentModal";
import { useProjectStore } from "@/stores/projectStore";
import { useMemberStore } from "@/stores/memberStore";
import { useAuthStore } from "@/stores/authStore";
import { FilePanel } from "@/components/ui/FilePanel";
import { DocumentPanel } from "@/components/ui/DocumentPanel";
import HuddleWidget from "@/components/huddle/HuddleWidget";

interface WorkspaceUpcomingDeadline {
  id: string;
  title: string;
  status: "todo" | "in_progress";
  priority: "low" | "medium" | "high";
  due_date: string;
  project_id: string;
  project_name: string;
}

interface ApiResponse {
  workspaceMembers: workspace_member[];
  workspaceProjects: project[];
  upcomingDeadlines: WorkspaceUpcomingDeadline[];
  dueSoonCount: number;
}

type ApiError = Error & { status?: number };

const PROJECT_COLORS = [
  "bg-tertiary-container/20 text-tertiary",
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-container text-primary",
  "bg-error-container/20 text-error",
];
const PROJECT_ICONS = [
  "design_services", "terminal", "folder", "analytics"
];

function deadlineChipDate(dateStr: string) {
  const date = new Date(dateStr);
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString("en-US", { day: "2-digit" }),
  };
}

function deadlineHint(dateStr: string) {
  const now = new Date();
  const due = new Date(dateStr);
  const msInDay = 24 * 60 * 60 * 1000;

  if (due.getTime() < now.getTime()) return "Overdue";
  if (due.toDateString() === now.toDateString()) return "Today";

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (due.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  const daysLeft = Math.ceil((due.getTime() - now.getTime()) / msInDay);
  return `${daysLeft}d left`;
}

export default function WorkspaceIdPage() {
  const { workspaceId } = useParams();
  const workspaceIdParam = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  const workspaceProjects = useProjectStore((s) => s.projects);
  const projectsLoading = useProjectStore((s) => s.isLoading);
  const { setProjects, setLoading: setProjectsLoading } = useProjectStore();

  const workspaceMembers = useMemberStore((s) => s.members);
  const membersLoading = useMemberStore((s) => s.isLoading);
  const { setMembers, setLoading: setMembersLoading } = useMemberStore();

  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserRole = workspaceMembers.find(m => m.user_id === currentUserId)?.role;

  const [error, setError] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<WorkspaceUpcomingDeadline[]>([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);

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

  const router = useRouter();

  useEffect(() => {
    if (!workspaceIdParam) return;

    const fetchWorkspaceInfo = async () => {
      setProjectsLoading(true);
      setMembersLoading(true);
      try {
        const response = await api.get<ApiResponse>(`/api/workspaces/${workspaceIdParam}/getinfo`);
        setMembers(workspaceIdParam, response.workspaceMembers);
        setProjects(workspaceIdParam, response.workspaceProjects);
        setUpcomingDeadlines(response.upcomingDeadlines ?? []);
        setDueSoonCount(response.dueSoonCount ?? 0);
        setError(false);
      } catch (e) {
        const err = e as ApiError;

        if (err.status === 401 || err.status === 403 || err.status === 404) {
          setProjectsLoading(false);
          setMembersLoading(false);
          router.replace("/dashboard");
          return;
        }

        setMembers(workspaceIdParam, []);
        setProjects(workspaceIdParam, []);
        setUpcomingDeadlines([]);
        setDueSoonCount(0);
        setError(true);
      }
    };

    fetchWorkspaceInfo();
  }, [workspaceIdParam, router, setMembers, setMembersLoading, setProjects, setProjectsLoading]);

  const isLoading = projectsLoading || membersLoading;
  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Daily Overview</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Welcome back, your workspace is seeing high activity today.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          {workspaceIdParam && (
            <HuddleWidget
              workspaceId={workspaceIdParam}
              getUserName={(id) => workspaceMembers.find((m) => m.user_id === id)?.name ?? id}
            />
          )}
          <button
            onClick={() => setShowCreateDocModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">post_add</span>
            Create Document
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error">
          Failed to load workspace data.
        </div>
      )}

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider">Total Members</p>
              <h3 className="font-headline text-5xl font-extrabold text-primary mt-2">{workspaceMembers.length}</h3>
            </div>
            <div className="bg-primary-container p-3 rounded-lg">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface-variant">+{workspaceMembers.length}</div>
            </div>
            <p className="text-xs text-on-surface-variant self-center font-medium">Active team members</p>
          </div>
          <div className="mt-4">
            <button onClick={() => setShowMembers(!showMembers)} className="text-sm font-bold text-primary hover:underline transition-all">
              {showMembers ? "Hide Members" : "Manage Members"}
            </button>
          </div>
        </div>

        <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-center">
          <p className="text-on-surface-variant text-sm font-medium">Projects</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-headline text-3xl font-bold">{workspaceProjects.length}</span>
            <span className="text-secondary text-xs font-bold">+1 new</span>
          </div>
        </div>

        <div className="bg-error-container/10 p-6 rounded-xl border border-error-container/10 flex flex-col justify-center">
          <p className="text-error font-semibold text-sm">Due Soon</p>
          <div className="flex items-center gap-3 mt-1 text-error">
            <span className="font-headline text-3xl font-bold">{dueSoonCount}</span>
            <span className="material-symbols-outlined">{dueSoonCount > 0 ? "priority_high" : "event_available"}</span>
          </div>
        </div>
      </div>

      {showMembers && (
        <div className="bg-surface-container-low rounded-xl p-6 transition-all duration-300">
          <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Workspace Members</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaceMembers.map(member => (
              <div key={member.user_id} className="bg-surface-container-lowest p-4 rounded-lg flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{member.name?.charAt(0).toUpperCase() ?? "U"}</div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{member.name}</p>
                  <p className="text-xs text-on-surface-variant uppercase">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowManageMembersModal(true)}
            className="mt-4 bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Invite New Member
          </button>
        </div>
      )}

      {/* Content Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-headline text-xl font-bold text-on-surface">Recent Projects</h4>
            <Link href={`/workspaces/${workspaceIdParam}/projects`} className="text-sm text-primary font-bold hover:underline">View All</Link>
          </div>

          {workspaceProjects.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
                <span className="material-symbols-outlined text-3xl">add</span>
              </div>
              <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">No Active Projects</h3>
              <p className="text-on-surface-variant text-sm font-body mb-4">You have no projects in this workspace yet.</p>
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
              >
                Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaceProjects.slice(0, 5).map((projectItem, index) => {
                const canDelete = currentUserRole === "admin" || currentUserRole === "owner" || projectItem.created_by === currentUserId;
                return (
                  <div
                    key={projectItem.id}
                    onClick={() => router.push(`/workspaces/${workspaceIdParam}/projects/${projectItem.id}`)}
                    className={`bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/5 hover:shadow-md transition-shadow group relative cursor-pointer ${deletingProjectId === projectItem.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`}>
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
                    <h5 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{projectItem.name}</h5>
                    <p className="text-on-surface-variant text-xs mt-1 mb-4 line-clamp-2 min-h-[2rem]">{projectItem.description || "No description provided."}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden mr-4">
                        <div className="bg-tertiary w-[50%] h-full rounded-full"></div>
                      </div>
                      <span className="text-[10px] font-bold text-on-surface-variant">50%</span>
                    </div>
                  </div>
                );
              })}
              {/* Add New Project Card */}
              <div
                onClick={() => setShowCreateProjectModal(true)}
                className="border-2 border-dashed border-outline-variant/30 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 hover:bg-surface-container-low transition-all group min-h-[180px]"
              >
                <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-all mb-2">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <p className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">New Project</p>
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="pt-4 space-y-4">
            <h4 className="font-headline text-xl font-bold text-on-surface">Upcoming Deadlines</h4>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/5">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-on-surface">No near deadlines</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Tasks in todo or in_progress due within 3 days will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {upcomingDeadlines.map((task) => {
                    const dateChip = deadlineChipDate(task.due_date);
                    return (
                      <div
                        key={task.id}
                        className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer"
                        onClick={() => router.push(`/workspaces/${workspaceIdParam}/projects/${task.project_id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 flex flex-col items-center justify-center bg-error-container/10 rounded-lg">
                            <span className="text-[10px] font-extrabold text-error">{dateChip.month}</span>
                            <span className="text-lg font-headline font-bold text-error leading-none">{dateChip.day}</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{task.title}</p>
                            <p className="text-on-surface-variant text-xs">{task.project_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-error">{deadlineHint(task.due_date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Resources Sidebar (1/3 width) */}
        <div className="space-y-6">
          {/* Workspace-level Files */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm">
            <FilePanel workspaceId={workspaceIdParam ?? ""} />
          </div>

          {/* Workspace-level Documents */}
          <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm">
            <DocumentPanel workspaceId={workspaceIdParam ?? ""} />
          </div>
        </div>
      </div>

      {showCreateProjectModal && workspaceIdParam && (
        <CreateProjectModal
          workspaceId={workspaceIdParam}
          onClose={() => setShowCreateProjectModal(false)}
        />
      )}
      {showManageMembersModal && (
        <ManageMembersModal onClose={() => setShowManageMembersModal(false)} />
      )}
      {showCreateDocModal && workspaceIdParam && (
        <CreateDocumentModal
          workspaceId={workspaceIdParam}
          onClose={() => setShowCreateDocModal(false)}
        />
      )}
    </div>
  );
}
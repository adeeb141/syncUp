"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";


interface MyProject {
  id: string;
  workspace_id: string;
  workspace_name: string;
  name: string;
  description: string;
  status: "active" | "completed";
  created_by: string;
  created_at: string;
  member_count: number;
  task_count: number;
}

const STATUS_FILTERS = ["all", "active", "completed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const PROJECT_COLORS = [
  "bg-tertiary-container/20 text-tertiary",
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-container text-primary",
  "bg-error-container/20 text-error",
];
const PROJECT_ICONS = [
  "design_services", "terminal", "folder", "analytics"
];

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMyProjects = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<{ projects: MyProject[] }>("/api/workspaces/my-projects");
        setProjects(data.projects);
        setError(false);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyProjects();
  }, []);

  if (isLoading) return <LoadingScreen />;

  const filtered = projects.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.workspace_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="pb-12 px-10 max-w-7xl mx-auto pt-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">
            My Projects
          </h1>
          <p className="text-on-surface-variant font-body">
            Projects where you created tasks or have tasks assigned to you.
          </p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Total Projects</p>
            <p className="font-headline text-2xl font-extrabold text-on-surface">{projects.length}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-tertiary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Active</p>
            <p className="font-headline text-2xl font-extrabold text-tertiary">{activeCount}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Completed</p>
            <p className="font-headline text-2xl font-extrabold text-secondary">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center bg-surface-container-high rounded-lg p-1">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf}
              onClick={() => setStatusFilter(sf)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                statusFilter === sf
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {sf === "all" ? "All" : sf.charAt(0).toUpperCase() + sf.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-high focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/30 rounded-lg text-sm text-on-surface transition-all outline-none border border-transparent focus:border-outline-variant/30"
          />
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error mb-6">
          Failed to load projects. The API endpoint hasn&apos;t been configured yet.
        </div>
      )}

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-3xl">folder_off</span>
          </div>
          <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">No Projects Found</h3>
          <p className="text-on-surface-variant text-sm font-body max-w-sm">
            {search || statusFilter !== "all"
              ? "Try adjusting your filters or search query."
              : "You're not a member of any projects yet. Join a workspace or create your first project."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((project, index) => (
            <div
              key={project.id}
              className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-outline-variant/40 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`}>
                  <span className="material-symbols-outlined">{PROJECT_ICONS[index % PROJECT_ICONS.length]}</span>
                </div>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    project.status === "active"
                      ? "bg-tertiary-container/20 text-tertiary"
                      : "bg-secondary-container text-on-secondary-container"
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <h3 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors mb-1">
                {project.name}
              </h3>
              <p className="text-on-surface-variant text-xs line-clamp-2 mb-4 min-h-[2rem] leading-relaxed">
                {project.description || "No description provided."}
              </p>

              {/* Workspace badge */}
              <div className="flex items-center gap-1.5 mb-4">
                <span className="material-symbols-outlined text-sm text-on-surface-variant">domain</span>
                <span className="text-[11px] font-semibold text-on-surface-variant">{project.workspace_name || "Workspace"}</span>
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                <div className="flex items-center gap-3 text-xs text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">group</span>
                    {project.member_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                    {project.task_count ?? 0}
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

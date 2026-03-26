"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuthStore } from "@/stores/authStore";

// Type for tasks returned by the "my tasks" API
interface MyTask {
  id: string;
  project_id: string;
  project_name: string;
  workspace_name: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignee_id: string;
  assignee_name: string | null;
  created_by: string;
  created_by_name: string | null;
  due_date: string | null;
  created_at: string;
}

const TABS = ["assigned", "created"] as const;
type TabFilter = (typeof TABS)[number];

const FILTER_PRIORITIES = ["all", "high", "medium", "low"] as const;
type PriorityFilter = (typeof FILTER_PRIORITIES)[number];

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  todo: { label: "To Do", dot: "bg-surface-variant", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
  in_progress: { label: "In Progress", dot: "bg-tertiary", bg: "bg-tertiary-container/20", text: "text-tertiary" },
  done: { label: "Done", dot: "bg-secondary", bg: "bg-secondary-container", text: "text-on-secondary-container" },
};

const PRIORITY_META: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "Low", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
  medium: { label: "Medium", bg: "bg-tertiary-container/20", text: "text-tertiary" },
  high: { label: "High", bg: "bg-error-container/20", text: "text-error" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

export default function MyTasksPage() {
  const user = useAuthStore((s) => s.user);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<TabFilter>("assigned");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchMyTasks = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<{ tasks: MyTask[] }>("/api/workspaces/projects/my-tasks");
        setTasks(data.tasks);
        setError(false);
      } catch (e) {
        console.error(e);
        setError(true);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyTasks();
  }, []);

  if (isLoading) return <LoadingScreen />;

  // Tab filtering
  const tabFiltered = tasks.filter((t) => {
    if (tab === "assigned") return t.assignee_id === user?.id;
    return t.created_by === user?.id;
  });

  // Priority + search filtering
  const filtered = tabFiltered.filter((t) => {
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchSearch =
      search.trim() === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (t.project_name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchPriority && matchSearch;
  });

  const todoCount = tabFiltered.filter((t) => t.status === "todo").length;
  const inProgressCount = tabFiltered.filter((t) => t.status === "in_progress").length;
  const doneCount = tabFiltered.filter((t) => t.status === "done").length;
  const overdueCount = tabFiltered.filter(
    (t) => t.status !== "done" && isOverdue(t.due_date)
  ).length;

  return (
    <div className="pb-12 px-10 max-w-7xl mx-auto pt-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">
            My Tasks
          </h1>
          <p className="text-on-surface-variant font-body">
            Track tasks assigned to you and tasks you&apos;ve created across all projects.
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-surface-container-high rounded-xl p-1 w-fit mb-8">
        <button
          onClick={() => setTab("assigned")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === "assigned"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">person</span>
            Assigned to Me
          </span>
        </button>
        <button
          onClick={() => setTab("created")}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            tab === "created"
              ? "bg-surface-container-lowest text-primary shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">edit_note</span>
            Created by Me
          </span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Total</p>
            <p className="font-headline text-2xl font-extrabold text-on-surface">{tabFiltered.length}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-surface-container-high flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface-variant" style={{ fontVariationSettings: "'FILL' 1" }}>radio_button_unchecked</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">To Do</p>
            <p className="font-headline text-2xl font-extrabold text-on-surface">{todoCount}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-tertiary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>pending</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">In Progress</p>
            <p className="font-headline text-2xl font-extrabold text-tertiary">{inProgressCount}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-secondary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">Done</p>
            <p className="font-headline text-2xl font-extrabold text-secondary">{doneCount}</p>
          </div>
        </div>
      </div>

      {/* Overdue banner */}
      {overdueCount > 0 && (
        <div className="bg-error-container/10 border border-error/15 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="text-sm font-semibold text-error">
            {overdueCount} task{overdueCount > 1 ? "s are" : " is"} overdue
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center bg-surface-container-high rounded-lg p-1">
          {FILTER_PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                priorityFilter === p
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {p === "all" ? "All" : PRIORITY_META[p].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-container-high focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/30 rounded-lg text-sm text-on-surface transition-all outline-none border border-transparent focus:border-outline-variant/30"
          />
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error mb-6">
          Failed to load tasks. The API endpoint hasn&apos;t been configured yet.
        </div>
      )}

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
            <span className="material-symbols-outlined text-3xl">checklist</span>
          </div>
          <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">No Tasks Found</h3>
          <p className="text-on-surface-variant text-sm font-body max-w-sm">
            {search || priorityFilter !== "all"
              ? "Try adjusting your filters or search query."
              : tab === "assigned"
              ? "No tasks have been assigned to you yet."
              : "You haven't created any tasks yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const sm = STATUS_META[task.status] || STATUS_META.todo;
            const pm = PRIORITY_META[task.priority] || PRIORITY_META.low;
            const overdue = task.status !== "done" && isOverdue(task.due_date);

            return (
              <div
                key={task.id}
                className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/10 shadow-sm hover:shadow-md hover:border-outline-variant/30 transition-all group cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${sm.dot}`}></div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors text-sm">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`${pm.bg} ${pm.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                          {pm.label}
                        </span>
                        <span className={`${sm.bg} ${sm.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                          {sm.label}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-on-surface-variant line-clamp-1 mb-3 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-xs text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">folder</span>
                        {task.project_name || "Project"}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">domain</span>
                        {task.workspace_name || "Workspace"}
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${overdue ? "text-error font-bold" : ""}`}>
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          {formatDate(task.due_date)}
                          {overdue && (
                            <span className="ml-1 text-[10px] bg-error-container/20 text-error px-1.5 py-0.5 rounded font-bold uppercase">
                              Overdue
                            </span>
                          )}
                        </span>
                      )}
                      {tab === "assigned" && task.created_by_name && (
                        <span className="flex items-center gap-1 ml-auto">
                          <span className="text-on-surface-variant">by</span>
                          <span className="font-semibold text-on-surface">{task.created_by_name}</span>
                        </span>
                      )}
                      {tab === "created" && task.assignee_name && (
                        <span className="flex items-center gap-1 ml-auto">
                          <span className="material-symbols-outlined text-sm">person</span>
                          <span className="font-semibold text-on-surface">{task.assignee_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

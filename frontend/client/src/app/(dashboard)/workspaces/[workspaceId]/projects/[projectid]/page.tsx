"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { AddTaskModal } from "@/components/ui/modals/AddTaskModal";
import { useTaskStore, TaskRow } from "@/stores/taskStore";

interface TasksApiResponse {
  project_id: string;
  total: number;
  tasks: TaskRow[];
}

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

function isDueSoon(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr).getTime();
  const now = Date.now();
  return due > now && due - now < 3 * 24 * 60 * 60 * 1000;
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() < Date.now();
}

const FILTER_PRIORITIES = ["all", "high", "medium", "low"] as const;
type PriorityFilter = (typeof FILTER_PRIORITIES)[number];

export default function ProjectsIdPage() {
  const { workspaceId, projectid } = useParams();
  const projectId = Array.isArray(projectid) ? projectid[0] : projectid;
  const wsId = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  // Read from Zustand task store
  const taskList = useTaskStore((s) => s.tasks);
  const tasksLoading = useTaskStore((s) => s.isLoading);
  const { setTasks, setLoading: setTasksLoading } = useTaskStore();

  const [error, setError] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchTasks = async () => {
      setTasksLoading(true);
      try {
        const data = await api.get<TasksApiResponse>(
          `/api/workspaces/${projectId}/tasksinfo`
        );
        setTasks(projectId, data.tasks);
        setError(false);
      } catch (e) {
        console.error(e);
        setError(true);
        setTasksLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  if (tasksLoading) return <LoadingScreen />;

  const filtered = taskList.filter((t) => {
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchSearch =
      search.trim() === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchPriority && matchSearch;
  });

  const todoTasks = filtered.filter(t => t.status === "todo");
  const inProgressTasks = filtered.filter(t => t.status === "in_progress");
  const doneTasks = filtered.filter(t => t.status === "done");

  const expandedTask = taskList.find(t => t.id === expandedId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-8 max-w-[1600px] mx-auto overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-end justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">Project Board</h1>
          <p className="text-on-surface-variant font-body">Manage tasks and track project progress.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-surface-container-high focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary/30 rounded-lg text-sm text-on-surface w-64 transition-all outline-none border border-transparent focus:border-outline-variant/30"
            />
          </div>
          <div className="flex items-center bg-surface-container-high rounded-lg p-1">
            {FILTER_PRIORITIES.map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors ${priorityFilter === p ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                {p === "all" ? "All" : PRIORITY_META[p].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="px-4 py-2 bg-gradient-to-br from-primary to-primary-dim rounded-lg font-manrope font-semibold text-sm text-white flex items-center gap-2 shadow-sm hover:opacity-90"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error mb-6 shrink-0">
          Failed to load tasks. Please try again.
        </div>
      )}

      {/* ── Kanban Board ── */}
      <div className="flex gap-6 overflow-x-auto overflow-y-hidden pb-4 pb-8 min-h-0 flex-1">

        <Column
          title="To Do"
          tasks={todoTasks}
          statusKey="todo"
          onExpand={(id) => setExpandedId(id)}
        />

        <Column
          title="In Progress"
          tasks={inProgressTasks}
          statusKey="in_progress"
          onExpand={(id) => setExpandedId(id)}
        />

        <Column
          title="Done"
          tasks={doneTasks}
          statusKey="done"
          onExpand={(id) => setExpandedId(id)}
        />

      </div>

      {/* Task Detail Sidebar Panel */}
      {expandedTask && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-inverse-surface/20 backdrop-blur-[2px] z-40 transition-opacity"
            onClick={() => setExpandedId(null)}
          ></div>

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-[450px] bg-surface-container-lowest shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-50 transform transition-transform duration-300 translate-x-0 border-l border-outline-variant/10 flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-outline-variant/10 bg-surface/50 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setExpandedId(null)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full"><span className="material-symbols-outlined">first_page</span></button>
                <span className={`${STATUS_META[expandedTask.status]?.bg || STATUS_META.todo.bg} ${STATUS_META[expandedTask.status]?.text || STATUS_META.todo.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                  {STATUS_META[expandedTask.status]?.label || STATUS_META.todo.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-sm">content_copy</span></button>
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-sm">more_horiz</span></button>
                <div className="w-px h-4 bg-outline-variant/30 mx-1"></div>
                <button onClick={() => setExpandedId(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
              {/* Title & Desc */}
              <div>
                <h2 className="text-2xl font-headline font-extrabold text-on-surface mb-4 leading-tight">{expandedTask.title}</h2>
                <div className="bg-surface-container-low rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Description</h4>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{expandedTask.description || "No description provided."}</p>
                </div>
              </div>

              {/* Task Properties Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors cursor-pointer group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Assignee</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border-2 border-surface-container-lowest">
                      {expandedTask.assignee_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-semibold text-on-surface">{expandedTask.assignee_name || "Unassigned"}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors cursor-pointer group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Due Date</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`material-symbols-outlined text-lg ${isOverdue(expandedTask.due_date) ? "text-error" : "text-outline"}`}>event</span>
                    <span className={`text-sm font-semibold text-on-surface ${isOverdue(expandedTask.due_date) ? "text-error" : ""}`}>{formatDate(expandedTask.due_date)}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors cursor-pointer group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Priority</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`${PRIORITY_META[expandedTask.priority]?.bg || PRIORITY_META.low.bg} ${PRIORITY_META[expandedTask.priority]?.text || PRIORITY_META.low.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                      {PRIORITY_META[expandedTask.priority]?.label || PRIORITY_META.low.label}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors cursor-pointer group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Created By</span>
                  <span className="text-sm font-semibold text-on-surface mt-1 truncate">{expandedTask.created_by_name || "—"}</span>
                </div>
              </div>

              <div className="text-[10px] text-center text-outline-variant uppercase tracking-widest pt-4 border-t border-outline-variant/10">
                Task ID: {expandedTask.id.substring(0, 8)} • Created: {formatDate(String(expandedTask.created_at))}
              </div>
            </div>
          </div>
        </>
      )}

      {showAddTask && projectId && (
        <AddTaskModal
          projectId={projectId}
          onClose={() => setShowAddTask(false)}
        />
      )}
    </div>
  );
}

function Column({ title, tasks, statusKey, onExpand }: { title: string, tasks: TaskRow[], statusKey: string, onExpand: (id: string) => void }) {
  const meta = STATUS_META[statusKey] || STATUS_META.todo;
  return (
    <div className="w-[340px] flex-shrink-0 flex flex-col bg-surface-container-lowest/30 rounded-2xl p-2">
      <div className="flex items-center justify-between mb-4 px-3 pt-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`}></span>
          <h3 className="font-headline font-bold text-on-surface text-lg">{title}</h3>
          <span className="bg-surface-container-high text-on-surface-variant text-xs font-bold px-2 py-0.5 rounded-full ml-1">{tasks.length}</span>
        </div>
        <button className="text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container p-1 rounded"><span className="material-symbols-outlined text-sm">add</span></button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-4 px-1 min-h-0">
        {tasks.map((task) => {
          const pm = PRIORITY_META[task.priority] || PRIORITY_META.low;
          const overdue = task.status !== "done" && isOverdue(task.due_date);
          return (
            <div
              key={task.id}
              onClick={() => onExpand(task.id)}
              className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/10 hover:shadow-md hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group relative"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`${pm.bg} ${pm.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{pm.label}</span>
                <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">more_horiz</span></button>
              </div>
              <h4 className="font-headline font-bold text-sm text-on-surface mb-1 group-hover:text-primary transition-colors">{task.title}</h4>
              <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">{task.description || "No description provided"}</p>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/10">
                <div className="flex -space-x-1.5">
                  {task.assignee_name && (
                    <div className="w-6 h-6 rounded-full bg-secondary border-2 border-surface-container-lowest flex items-center justify-center text-[8px] font-bold text-on-secondary">
                      {task.assignee_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-3 text-xs font-medium ${overdue ? 'text-error' : 'text-on-surface-variant'}`}>
                  {task.due_date && (
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span> {formatDate(task.due_date)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="h-24 border-2 border-dashed border-outline-variant/20 rounded-xl flex items-center justify-center text-outline-variant text-xs font-medium">
            No tasks in this column
          </div>
        )}
      </div>
    </div>
  );
}
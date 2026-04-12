"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { FilePanel } from "@/components/ui/FilePanel";
import { DocumentPanel } from "@/components/ui/DocumentPanel";

// Type for tasks returned by the "my tasks" API
interface MyTask {
  id: string;
  project_id: string;
  workspace_id: string;
  project_name: string;
  workspace_name: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high";
  assignee_id: string;
  assignee_name: string | null;
  created_by: string;
  created_by_name: string | null;
  due_date: string | null;
  review_remarks: string | null;
  created_at: string;
}

const TABS = ["assigned", "created"] as const;
type TabFilter = (typeof TABS)[number];

const FILTER_PRIORITIES = ["all", "high", "medium", "low"] as const;
type PriorityFilter = (typeof FILTER_PRIORITIES)[number];

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  todo: { label: "To Do", dot: "bg-surface-variant", bg: "bg-surface-container-high", text: "text-on-surface-variant" },
  in_progress: { label: "In Progress", dot: "bg-tertiary", bg: "bg-tertiary-container/20", text: "text-tertiary" },
  in_review: { label: "In Review", dot: "bg-amber-500", bg: "bg-amber-100/20", text: "text-amber-700" },
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectingTaskId, setRejectingTaskId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [rejectError, setRejectError] = useState("");

  useEffect(() => {
    const fetchMyTasks = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<{ tasks: MyTask[] }>("/api/projects/my-tasks");
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

  // ── Review Actions ──────────────────────────────────────────────
  const handleRequestReview = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const data = await api.patch<{ task: MyTask }>(`/api/projects/${taskId}/request-review`, {});
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const data = await api.patch<{ task: MyTask }>(`/api/projects/${taskId}/handle-review`, {
        action: "approve",
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (taskId: string) => {
    if (!rejectRemarks.trim()) {
      setRejectError("Please provide remarks for rejection.");
      return;
    }
    setActionLoadingId(taskId);
    setRejectError("");
    try {
      const data = await api.patch<{ task: MyTask }>(`/api/projects/${taskId}/handle-review`, {
        action: "reject",
        remarks: rejectRemarks.trim(),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...data.task } : t))
      );
      setRejectingTaskId(null);
      setRejectRemarks("");
    } catch (e: any) {
      console.error(e);
      setRejectError(e.message || "Failed to reject task");
    } finally {
      setActionLoadingId(null);
    }
  };

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
  const inReviewCount = tabFiltered.filter((t) => t.status === "in_review").length;
  const doneCount = tabFiltered.filter((t) => t.status === "done").length;
  const overdueCount = tabFiltered.filter(
    (t) => t.status !== "done" && isOverdue(t.due_date)
  ).length;

  const expandedTask = tasks.find((t) => t.id === expandedId);

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
      <div className="grid grid-cols-5 gap-4 mb-8">
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
          <div className="w-11 h-11 rounded-lg bg-amber-100/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-600" style={{ fontVariationSettings: "'FILL' 1" }}>rate_review</span>
          </div>
          <div>
            <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">In Review</p>
            <p className="font-headline text-2xl font-extrabold text-amber-600">{inReviewCount}</p>
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

      {/* Reject Modal */}
      {rejectingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/20 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-error-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-error">undo</span>
              </div>
              <div>
                <h3 className="font-manrope font-bold text-on-surface text-lg">Reject Task</h3>
                <p className="text-on-surface-variant text-xs">Provide feedback on what needs to be fixed</p>
              </div>
            </div>
            <textarea
              autoFocus
              value={rejectRemarks}
              onChange={(e) => {
                setRejectRemarks(e.target.value);
                setRejectError("");
              }}
              placeholder="What needs to be changed..."
              rows={4}
              className="w-full bg-surface-container-high rounded-xl p-3 text-sm text-on-surface placeholder:text-outline outline-none border border-outline-variant/20 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            />
            {rejectError && (
              <p className="text-error text-xs mt-1.5 font-medium">{rejectError}</p>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectingTaskId(null);
                  setRejectRemarks("");
                  setRejectError("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingTaskId)}
                disabled={actionLoadingId === rejectingTaskId}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoadingId === rejectingTaskId ? (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">send</span>
                )}
                Send Back
              </button>
            </div>
          </div>
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
            const isAssignee = task.assignee_id === user?.id;
            const isCreator = task.created_by === user?.id;
            const isInReview = task.status === "in_review";
            const canRequestReview = isAssignee && (task.status === "todo" || task.status === "in_progress");
            const canReview = isCreator && isInReview;
            const wasRejected = isAssignee && task.status === "in_progress" && !!task.review_remarks;

            return (
              <div
                key={task.id}
                onClick={() => setExpandedId(task.id)}
                className={`bg-surface-container-lowest rounded-xl p-5 border shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                  canReview
                    ? "border-amber-400/50 ring-1 ring-amber-400/20 shadow-amber-100/30"
                    : wasRejected
                    ? "border-error/30 ring-1 ring-error/10"
                    : "border-outline-variant/10 hover:border-outline-variant/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${sm.dot} ${isInReview ? "animate-pulse" : ""}`}></div>

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

                    {/* Rejection remarks banner — shown to assignee */}
                    {wasRejected && (
                      <div className="bg-error-container/10 border border-error/15 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                        <span className="material-symbols-outlined text-error text-sm mt-0.5">feedback</span>
                        <div>
                          <p className="text-[10px] font-bold text-error uppercase tracking-wider mb-0.5">Revision Needed</p>
                          <p className="text-xs text-error/80 leading-relaxed">{task.review_remarks}</p>
                        </div>
                      </div>
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

                    {/* ── Review Action Buttons ─────────────────────────── */}

                    {/* Assignee: Request Review */}
                    {tab === "assigned" && canRequestReview && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestReview(task.id);
                          }}
                          disabled={actionLoadingId === task.id}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-400/30 transition-all disabled:opacity-50"
                        >
                          {actionLoadingId === task.id ? (
                            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">rate_review</span>
                          )}
                          Request Review
                        </button>
                      </div>
                    )}

                    {/* Assignee: Awaiting Review indicator */}
                    {tab === "assigned" && isAssignee && isInReview && (
                      <div className="mt-3 pt-3 border-t border-outline-variant/10">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100/30 text-amber-700 border border-amber-300/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          Awaiting Review
                        </span>
                      </div>
                    )}

                    {/* Creator: Approve / Reject when task is in_review */}
                    {tab === "created" && canReview && (
                      <div className="mt-3 pt-3 border-t border-amber-300/20">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 mr-auto">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span className="text-xs font-bold text-amber-700">Review Requested</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRejectingTaskId(task.id);
                              setRejectRemarks("");
                              setRejectError("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-error-container/15 text-error hover:bg-error-container/30 border border-error/20 transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">undo</span>
                            Reject
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(task.id);
                            }}
                            disabled={actionLoadingId === task.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-secondary text-on-secondary hover:bg-secondary/90 transition-all disabled:opacity-50"
                          >
                            {actionLoadingId === task.id ? (
                              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                            )}
                            Approve
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Task Detail Sidebar Panel ── */}
      {expandedTask && (
        <>
          <div
            className="fixed inset-0 bg-inverse-surface/20 backdrop-blur-[2px] z-40 transition-opacity"
            onClick={() => setExpandedId(null)}
          ></div>

          <div className="fixed inset-y-0 right-0 w-[450px] bg-surface-container-lowest shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-50 transform transition-transform duration-300 translate-x-0 border-l border-outline-variant/10 flex flex-col">
            <div className="h-16 flex items-center justify-between px-6 border-b border-outline-variant/10 bg-surface/50 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setExpandedId(null)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center p-1 rounded-full">
                  <span className="material-symbols-outlined">first_page</span>
                </button>
                <span className={`${STATUS_META[expandedTask.status]?.bg || STATUS_META.todo.bg} ${STATUS_META[expandedTask.status]?.text || STATUS_META.todo.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                  {STATUS_META[expandedTask.status]?.label || STATUS_META.todo.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"><span className="material-symbols-outlined text-sm">content_copy</span></button>
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
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Assignee</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold border-2 border-surface-container-lowest">
                      {expandedTask.assignee_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-semibold text-on-surface">{expandedTask.assignee_name || "Unassigned"}</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Due Date</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`material-symbols-outlined text-lg ${isOverdue(expandedTask.due_date) ? "text-error" : "text-outline"}`}>event</span>
                    <span className={`text-sm font-semibold text-on-surface ${isOverdue(expandedTask.due_date) ? "text-error" : ""}`}>{formatDate(expandedTask.due_date)}</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Priority</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`${PRIORITY_META[expandedTask.priority]?.bg || PRIORITY_META.low.bg} ${PRIORITY_META[expandedTask.priority]?.text || PRIORITY_META.low.text} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>
                      {PRIORITY_META[expandedTask.priority]?.label || PRIORITY_META.low.label}
                    </span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 flex flex-col gap-1 hover:border-primary/20 transition-colors group">
                  <span className="text-[10px] font-bold uppercase text-on-surface-variant group-hover:text-primary transition-colors">Project</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="material-symbols-outlined text-lg text-outline">folder</span>
                    <span className="text-sm font-semibold text-on-surface truncate">{expandedTask.project_name || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Rejection remarks */}
              {expandedTask.review_remarks && (
                <div className="bg-error-container/10 border border-error/15 rounded-xl px-4 py-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-sm mt-0.5">feedback</span>
                  <div>
                    <p className="text-[10px] font-bold text-error uppercase tracking-wider mb-0.5">Revision Needed</p>
                    <p className="text-xs text-error/80 leading-relaxed">{expandedTask.review_remarks}</p>
                  </div>
                </div>
              )}

              {/* ── Task-level Attachments ── */}
              <div className="bg-surface-container-low rounded-xl p-4">
                <FilePanel
                  workspaceId={expandedTask.workspace_id}
                  projectId={expandedTask.project_id}
                  taskId={expandedTask.id}
                />
              </div>

              {/* ── Task-level Documents ── */}
              <div className="bg-surface-container-low rounded-xl p-4">
                <DocumentPanel
                  workspaceId={expandedTask.workspace_id}
                  projectId={expandedTask.project_id}
                  taskId={expandedTask.id}
                />
              </div>

              <div className="text-[10px] text-center text-outline-variant uppercase tracking-widest pt-4 border-t border-outline-variant/10">
                Task ID: {expandedTask.id.substring(0, 8)} • Created: {formatDate(expandedTask.created_at)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

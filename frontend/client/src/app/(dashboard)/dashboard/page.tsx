"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

interface OwnedWorkspace {
  workspace_id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count: number;
}

interface AssignedTaskStats {
  total: number;
  overdue: number;
  due_soon: number;
  in_review: number;
  done: number;
}

interface CreatedTaskStats {
  total: number;
  in_review: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  project_name: string;
  workspace_name: string;
}

interface DashboardData {
  owned_workspaces: OwnedWorkspace[];
  total_projects: number;
  assigned_tasks: AssignedTaskStats;
  created_tasks: CreatedTaskStats;
  upcoming_deadlines: UpcomingDeadline[];
  completion_rate: number;
}

function dueDateUrgency(dateStr: string): { color: "red" | "orange" | "yellow" | "green"; label: string } {
  const now = new Date();
  const due = new Date(dateStr);

  // Compare dates only (ignore time)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.floor((dueDay.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays < 0) return { color: "red", label: "Overdue" };
  if (diffDays === 0) return { color: "orange", label: "Due today" };
  if (diffDays === 1) return { color: "yellow", label: "Due tomorrow" };
  if (diffDays <= 3) return { color: "yellow", label: `${diffDays}d left` };
  return { color: "green", label: "On track" };
}

const URGENCY_COLORS = {
  red: {
    dot: "bg-red-500",
    text: "text-red-600",
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
  },
  orange: {
    dot: "bg-orange-500",
    text: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-500/20",
  },
  yellow: {
    dot: "bg-amber-500",
    text: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
  green: {
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<DashboardData>("/api/dashboard/stats");
        setData(res);
        setError(false);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <LoadingScreen />;

  const pct = data ? Math.round(data.completion_rate * 100) : 0;
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="p-8 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">
          Welcome back, {user?.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-on-surface-variant font-body">
          Here's an overview of your activity across all workspaces.
        </p>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error">
          Failed to load dashboard data. Please refresh.
        </div>
      )}

      {data && (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Owned Workspaces */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-primary text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    workspaces
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-full">
                  Owner
                </span>
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">
                Owned Workspaces
              </p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">
                {data.owned_workspaces.length}
              </p>
            </div>

            {/* Projects */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-tertiary-container/30 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-tertiary text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    account_tree
                  </span>
                </div>
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">
                My Projects
              </p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">
                {data.total_projects}
              </p>
            </div>

            {/* Assigned Tasks */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-secondary-container text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    task_alt
                  </span>
                </div>
                {data.assigned_tasks.overdue > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-error-container/20 text-error animate-pulse">
                    {data.assigned_tasks.overdue} overdue
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">
                Assigned to Me
              </p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">
                {data.assigned_tasks.total}
              </p>
            </div>

            {/* Created Tasks */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-on-surface-variant text-xl"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    edit_note
                  </span>
                </div>
                {data.created_tasks.in_review > 0 && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100/40 text-amber-700">
                    {data.created_tasks.in_review} needs review
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider mb-1">
                Created by Me
              </p>
              <p className="font-headline text-3xl font-extrabold text-on-surface">
                {data.created_tasks.total}
              </p>
            </div>
          </div>

          {/* ── Main Content Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ── Left: 2/3 ── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Deadlines */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-lg">
                      schedule
                    </span>
                    <h3 className="font-headline font-bold text-on-surface text-lg">
                      Upcoming Deadlines
                    </h3>
                    {data.upcoming_deadlines.length > 0 && (
                      <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {data.upcoming_deadlines.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/tasks"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View All Tasks →
                  </Link>
                </div>

                {data.upcoming_deadlines.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-3">
                      <span className="material-symbols-outlined text-2xl">
                        event_available
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-on-surface mb-1">
                      All caught up!
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      No upcoming deadlines for you.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {data.upcoming_deadlines.map((task) => {
                      const urgency = dueDateUrgency(task.due_date);
                      const uc = URGENCY_COLORS[urgency.color];
                      return (
                        <div
                          key={task.id}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors"
                        >
                          {/* Urgency indicator */}
                          <div
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${uc.dot} ${urgency.color === "red" ? "animate-pulse" : ""}`}
                          ></div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">
                                  folder
                                </span>
                                {task.project_name}
                              </span>
                              <span className="opacity-30">•</span>
                              <span>{task.workspace_name}</span>
                            </div>
                          </div>

                          {/* Due date badge */}
                          <div
                            className={`${uc.bg} ${uc.border} border rounded-lg px-3 py-1.5 flex items-center gap-1.5 shrink-0`}
                          >
                            <span
                              className={`material-symbols-outlined text-sm ${uc.text}`}
                            >
                              schedule
                            </span>
                            <span
                              className={`text-xs font-bold ${uc.text}`}
                            >
                              {urgency.label} · {formatDate(task.due_date)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Owned Workspaces List */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-outline-variant/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-primary text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      shield_person
                    </span>
                    <h3 className="font-headline font-bold text-on-surface text-lg">
                      Workspaces You Own
                    </h3>
                  </div>
                  <Link
                    href="/workspaces"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    All Workspaces →
                  </Link>
                </div>

                {data.owned_workspaces.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-3">
                      <span className="material-symbols-outlined text-2xl">
                        add_circle
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-on-surface mb-1">
                      No workspaces yet
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      Create your first workspace to get started.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-outline-variant/10">
                    {data.owned_workspaces.map((ws, i) => {
                      const colors = [
                        "bg-primary",
                        "bg-tertiary",
                        "bg-secondary",
                        "bg-error",
                      ];
                      return (
                        <Link
                          key={ws.workspace_id}
                          href={`/workspaces/${ws.workspace_id}`}
                          className="px-6 py-4 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors group"
                        >
                          <div
                            className={`w-10 h-10 rounded-xl ${colors[i % colors.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                          >
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                              {ws.name}
                            </p>
                            <p className="text-[11px] text-on-surface-variant">
                              {ws.slug} · {ws.member_count} member
                              {ws.member_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                            arrow_forward
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right sidebar: 1/3 ── */}
            <div className="space-y-6">
              {/* Completion Rate Ring */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm flex flex-col items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-5 self-start">
                  Completion Rate
                </h4>
                <div className="relative">
                  <svg
                    width="100"
                    height="100"
                    className="transform -rotate-90"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-surface-container-high"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeOffset}
                      className="text-primary transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-headline text-2xl font-extrabold text-on-surface">
                      {pct}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant mt-4 text-center">
                  {data.assigned_tasks.done} of {data.assigned_tasks.total}{" "}
                  assigned tasks completed
                </p>
              </div>

              {/* Task Breakdown */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                  Assigned Tasks Breakdown
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-surface-variant"></div>
                      <span className="text-sm text-on-surface font-medium">
                        To Do
                      </span>
                    </div>
                    <span className="font-headline font-bold text-on-surface text-sm">
                      {data.assigned_tasks.total -
                        data.assigned_tasks.done -
                        data.assigned_tasks.in_review}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <span className="text-sm text-on-surface font-medium">
                        In Review
                      </span>
                    </div>
                    <span className="font-headline font-bold text-amber-600 text-sm">
                      {data.assigned_tasks.in_review}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-sm text-on-surface font-medium">
                        Done
                      </span>
                    </div>
                    <span className="font-headline font-bold text-emerald-600 text-sm">
                      {data.assigned_tasks.done}
                    </span>
                  </div>
                  {data.assigned_tasks.overdue > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-sm text-on-surface font-medium">
                          Overdue
                        </span>
                      </div>
                      <span className="font-headline font-bold text-red-600 text-sm">
                        {data.assigned_tasks.overdue}
                      </span>
                    </div>
                  )}
                  {data.assigned_tasks.due_soon > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <span className="text-sm text-on-surface font-medium">
                          Due Soon
                        </span>
                      </div>
                      <span className="font-headline font-bold text-amber-500 text-sm">
                        {data.assigned_tasks.due_soon}
                      </span>
                    </div>
                  )}
                </div>

                {/* Progress bar visualization */}
                {data.assigned_tasks.total > 0 && (
                  <div className="mt-5 h-2 bg-surface-container-high rounded-full overflow-hidden flex">
                    {data.assigned_tasks.done > 0 && (
                      <div
                        className="bg-emerald-500 transition-all duration-700"
                        style={{
                          width: `${(data.assigned_tasks.done / data.assigned_tasks.total) * 100}%`,
                        }}
                      ></div>
                    )}
                    {data.assigned_tasks.in_review > 0 && (
                      <div
                        className="bg-amber-500 transition-all duration-700"
                        style={{
                          width: `${(data.assigned_tasks.in_review / data.assigned_tasks.total) * 100}%`,
                        }}
                      ></div>
                    )}
                    {data.assigned_tasks.overdue > 0 && (
                      <div
                        className="bg-red-500 transition-all duration-700"
                        style={{
                          width: `${(data.assigned_tasks.overdue / data.assigned_tasks.total) * 100}%`,
                        }}
                      ></div>
                    )}
                  </div>
                )}
              </div>

              {/* In Review Card — for tasks YOU created that are awaiting your review */}
              {data.created_tasks.in_review > 0 && (
                <div className="bg-amber-500/5 rounded-2xl p-6 border border-amber-400/20 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100/40 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-600 text-lg">
                        rate_review
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        Pending Reviews
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        Tasks awaiting your review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-headline text-3xl font-extrabold text-amber-700">
                      {data.created_tasks.in_review}
                    </span>
                    <Link
                      href="/tasks"
                      className="text-xs font-bold text-amber-700 bg-amber-100/50 hover:bg-amber-100/80 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Review Now →
                    </Link>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-gradient-to-br from-primary to-primary-dim rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-xl"></div>
                <h4 className="font-bold text-lg mb-2 relative z-10">Quick Actions</h4>
                <p className="text-sm opacity-80 mb-5 relative z-10">
                  Jump to where you need to be.
                </p>
                <div className="space-y-2 relative z-10">
                  <Link
                    href="/workspaces"
                    className="w-full flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      workspaces
                    </span>
                    Browse Workspaces
                  </Link>
                  <Link
                    href="/tasks"
                    className="w-full flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      task_alt
                    </span>
                    View My Tasks
                  </Link>
                  <Link
                    href="/projects"
                    className="w-full flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      account_tree
                    </span>
                    View Projects
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import AuthGate from "@/components/ui/AuthGate";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User } from "@/types";
import { WorkspaceProvider } from "@/components/ui/WorkspaceProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <WorkspaceProvider />
      <DashboardContent>{children}</DashboardContent>
    </AuthGate>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const safeUser = user as User;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { icon: <GridIcon />, label: "Workspaces", href: "/workspaces", active: true },
    { icon: <FolderIcon />, label: "Projects", href: "#", active: false },
    { icon: <TaskIcon />, label: "My Tasks", href: "#", active: false },
    { icon: <MembersIcon />, label: "Members", href: "#", active: false },
    { icon: <SettingsIcon />, label: "Settings", href: "#", active: false },
  ];

  return (
    <div className="sync-shell min-h-screen font-[var(--font-body)]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "relative z-20 flex min-h-screen shrink-0 flex-col border-r border-[color:var(--surface-border)] bg-[color:var(--surface-1)]/90 py-6 shadow-[0_8px_30px_rgba(28,40,63,0.08)] backdrop-blur transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            sidebarCollapsed ? "w-[82px]" : "w-[274px]"
          )}
        >
          <div
            className={cn(
              "mb-10 flex items-center gap-3 overflow-hidden whitespace-nowrap transition-[padding] duration-300",
              sidebarCollapsed ? "justify-center px-5" : "px-6"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-gradient)] font-[var(--font-heading)] text-lg font-bold text-[color:var(--primary-foreground)] shadow-[0_8px_16px_rgba(78,106,166,0.28)]">
              S
            </div>
            <span
              className={cn(
                "sync-title overflow-hidden text-[1.15rem] transition-all duration-300",
                sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              SyncUp
            </span>
          </div>

          <button
            className={cn(
              "absolute right-4 top-7 flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] text-[color:var(--text-muted)] transition-all duration-200 hover:scale-105 hover:border-[color:var(--accent-solid)]/40 hover:text-[color:var(--text-primary)]",
              sidebarCollapsed ? "opacity-0" : "opacity-100"
            )}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </button>

          <p
            className={cn(
              "mb-3 overflow-hidden whitespace-nowrap px-6 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-all duration-300",
              sidebarCollapsed ? "mb-0 h-0 opacity-0" : "h-4 opacity-100"
            )}
          >
            Overview
          </p>

          <ul className="flex flex-1 list-none flex-col gap-1 px-3">
            {navItems.map((item, index) => (
              <li key={item.label} style={{ animation: `fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) ${0.1 + index * 0.05}s both` }}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl border px-3 py-2.5 text-[0.86rem] font-medium no-underline transition-all duration-200",
                    sidebarCollapsed ? "justify-center" : "justify-start",
                    item.active
                      ? "border-[color:var(--accent-solid)]/25 bg-[color:var(--accent-soft)] text-[color:var(--accent-solid)] shadow-[inset_0_0_0_1px_rgba(82,108,176,0.08)]"
                      : "border-transparent text-[color:var(--text-secondary)] hover:border-[color:var(--surface-border)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--text-primary)]"
                  )}
                >
                  {item.active && !sidebarCollapsed && (
                    <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-md bg-[color:var(--accent-solid)]" />
                  )}

                  <span
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      item.active ? "text-[color:var(--accent-solid)]" : "text-[color:var(--text-muted)]"
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      "transition-all duration-300",
                      sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-2 border-t border-[color:var(--surface-border)] px-3 pt-4">
            <div className="group flex items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl border border-transparent px-3 py-2 transition-all duration-200 hover:border-[color:var(--surface-border)] hover:bg-[color:var(--surface-2)]">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] font-[var(--font-heading)] text-[0.82rem] font-semibold text-[color:var(--text-secondary)] transition-colors group-hover:border-[color:var(--accent-solid)]/30 group-hover:text-[color:var(--accent-solid)]">
                {safeUser.name?.charAt(0).toUpperCase()}
              </div>
              <div
                className={cn(
                  "min-w-0 flex-1 overflow-hidden transition-all duration-300",
                  sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                <p className="truncate text-[0.82rem] font-semibold text-[color:var(--text-primary)]">{safeUser.name}</p>
                <p className="mt-0.5 truncate text-xs text-[color:var(--text-muted)]">{safeUser.email}</p>
              </div>
            </div>

            <button
              className="mt-1 flex w-full items-center gap-3 overflow-hidden whitespace-nowrap rounded-xl border border-transparent px-3 py-2.5 text-left text-[0.82rem] font-medium text-[color:var(--text-muted)] transition-all duration-200 hover:border-[rgba(178,82,98,0.25)] hover:bg-[rgba(178,82,98,0.08)] hover:text-[color:#9f3e51]"
              onClick={() => logout()}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                <LogoutIcon />
              </span>
              <span
                className={cn(
                  "transition-all duration-300",
                  sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                )}
              >
                Sign out
              </span>
            </button>
          </div>
        </aside>

        {sidebarCollapsed && (
          <button
            className="fixed left-[94px] top-7 z-[100] flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--surface-border)] bg-[color:var(--surface-1)] text-[color:var(--text-muted)] shadow-[var(--shadow-soft)] transition-all duration-300 hover:scale-105 hover:text-[color:var(--text-primary)] animate-[scaleIn_0.3s_ease_both]"
            onClick={() => setSidebarCollapsed(false)}
          >
            <ChevronRightIcon />
          </button>
        )}

        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 md:px-12">
          <div className="sync-page mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function GridIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}
function FolderIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}
function TaskIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}
function MembersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function LogoutIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function ChevronLeftIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function ChevronRightIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>;
}

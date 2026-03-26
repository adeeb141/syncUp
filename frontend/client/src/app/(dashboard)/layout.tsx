"use client";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import AuthGate from "@/components/ui/AuthGate";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User } from "@/types";
import { WorkspaceProvider } from "@/components/ui/WorkspaceProvider";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname() || "";

  const navItems = [
    { icon: "dashboard", label: "Dashboard", href: "#",  },
    { icon: "group_work", label: "Workspaces", href: "/workspaces" },
    { icon: "account_tree", label: "Projects", href: "#" },
    { icon: "task_alt", label: "My Tasks", href: "#" },
    { icon: "notifications", label: "Notifications", href: "#" },
    { icon: "settings", label: "Settings", href: "#" },
  ];

  return (
    <div className="bg-surface font-body text-on-surface">
      <aside className="bg-slate-950 dark:bg-[#0b0f10] text-slate-400 dark:text-[#f7f9fb] font-manrope font-medium text-sm tracking-tight h-screen w-64 fixed left-0 top-0 overflow-y-auto z-40 shadow-2xl dark:shadow-none flex flex-col py-6">
        <div className="px-6 mb-8">
          <h1 className="text-lg font-bold text-white tracking-widest uppercase">SyncUp</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Collaborative Task Management Platform</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== "#";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "rounded-lg mx-2 px-3 py-2 flex items-center gap-3 transition-all",
                  isActive
                    ? "bg-[#575f75] text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                <span className="material-symbols-outlined" data-icon={item.icon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-4">
          <button className="w-full bg-primary-gradient text-on-primary font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined" data-icon="add">add</span>
            New Project
          </button>
          
          <div className="mt-6 flex items-center justify-between px-2 py-4 border-t border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-headline text-[0.82rem] font-semibold text-white">
                {safeUser?.name?.charAt(0).toUpperCase()}
               </div>
              <div className="overflow-hidden">
                <p className="text-white text-sm font-semibold truncate">{safeUser?.name}</p>
                <p className="text-xs text-slate-500 truncate">{safeUser?.email}</p>
              </div>
            </div>
            <button onClick={() => logout()} className="text-slate-500 hover:text-white transition-colors" title="Logout">
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen bg-surface">
         {children}
      </main>
    </div>
  );
}

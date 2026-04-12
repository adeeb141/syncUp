"use client";
import { useAuthStore } from "@/stores/authStore";
import { useState } from "react";
import AuthGate from "@/components/ui/AuthGate";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { User } from "@/types";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/stores/notificationStore";
import { api } from "@/lib/api";
import { WorkspaceProvider } from "@/components/ui/WorkspaceProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <WorkspaceProvider />
      <DashboardContent>{children}</DashboardContent>
    </AuthGate>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {  const { user, logout } = useAuthStore();
  const safeUser = user as User;
  const pathname = usePathname() || "";
  
  const invites = useNotificationStore((s) => s.invites);
  const removeInvite = useNotificationStore((s) => s.removeInvite);
  const [showNotifications, setShowNotifications] = useState(false);
  const [processingInvites, setProcessingInvites] = useState<Record<string, boolean>>({});

  const handleInviteAction = async (inviteId: string, workspaceId: string, action: "accept" | "reject") => {
    setProcessingInvites(prev => ({ ...prev, [inviteId]: true }));
    try {
       await api.post(`/api/invite/${action}`, { workspace_id: workspaceId });
       removeInvite(inviteId);
    } catch (err) {
       console.error(`Failed to ${action} invite:`, err);
       alert("Something went wrong with the invite action.");
    } finally {
       setProcessingInvites(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  const navItems = [
    { icon: "dashboard", label: "Dashboard", href: "/dashboard",  },
    { icon: "group_work", label: "Workspaces", href: "/workspaces" },
    { icon: "account_tree", label: "Projects", href: "/projects" },
    { icon: "task_alt", label: "My Tasks", href: "/tasks" },
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
          {navItems.map((item) => {
            if (item.label === "Notifications") {
              return (
                <button
                  key={item.label}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={cn(
                    "w-[calc(100%-1rem)] rounded-lg mx-2 px-3 py-2 flex items-center justify-between transition-all outline-none",
                    showNotifications
                      ? "bg-[#575f75] text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined" data-icon={item.icon}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {invites.length > 0 && (
                    <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{invites.length}</span>
                  )}
                </button>
              );
            }

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

      <main className="ml-64 min-h-screen bg-surface relative overflow-hidden">
         {children}

         {/* Notifications Slide-out Panel */}
         <div className={cn(
           "fixed inset-y-0 right-0 w-96 bg-surface-container-lowest shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-outline-variant/10 flex flex-col",
           showNotifications ? "translate-x-0" : "translate-x-full"
         )}>
           <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <span className="material-symbols-outlined text-primary">notifications</span>
               <h3 className="font-headline font-bold text-lg text-on-surface">Notifications</h3>
             </div>
             <button
               onClick={() => setShowNotifications(false)}
               className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
             >
               <span className="material-symbols-outlined text-sm">close</span>
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {invites.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-on-surface-variant opacity-70">
                 <span className="material-symbols-outlined text-4xl mb-3">notifications_paused</span>
                 <p className="text-sm">No new notifications</p>
               </div>
             ) : (
               invites.map((invite) => (
                 <div key={invite.id} className="bg-surface-container-low p-4 rounded-xl shadow-sm border border-outline-variant/5">
                   <div className="flex gap-3 mb-3">
                     <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                       <span className="material-symbols-outlined text-lg">mail</span>
                     </div>
                     <div>
                       <p className="text-sm font-medium text-on-surface">
                         <span className="font-bold">{invite.invited_by_name}</span> invited you to join <span className="font-bold text-primary">{invite.workspace_name}</span>
                       </p>
                       <p className="text-xs text-on-surface-variant mt-1">{invite.invited_by_email}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 mt-4">
                     <button
                       onClick={() => handleInviteAction(invite.id, invite.workspace_id, "accept")}
                       disabled={processingInvites[invite.id]}
                       className={`flex-1 bg-primary text-white py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 ${processingInvites[invite.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       Accept
                     </button>
                     <button
                       onClick={() => handleInviteAction(invite.id, invite.workspace_id, "reject")}
                       disabled={processingInvites[invite.id]}
                       className={`flex-1 bg-surface-container-high text-on-surface-variant py-2 rounded-lg text-xs font-bold transition-colors hover:bg-surface-container-highest hover:text-on-surface ${processingInvites[invite.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                       Reject
                     </button>
                   </div>
                 </div>
               ))
             )}
           </div>
         </div>
         
         {/* Overlay to close panel when clicking outside */}
         {showNotifications && (
           <div 
             className="fixed inset-0 bg-transparent z-40"
             onClick={() => setShowNotifications(false)}
           />
         )}
      </main>
    </div>
  );
}

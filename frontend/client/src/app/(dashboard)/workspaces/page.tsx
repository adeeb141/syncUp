"use client";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useState } from "react";
import { api } from "@/lib/api";

const COLORS = [
  "bg-primary-container text-primary",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container/20 text-tertiary",
  "bg-surface-container-high text-on-surface-variant",
];
const ICONS = [
  "domain", "domain", "domain", "domain"
]

export default function WorkspacesPage() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isLoadingWorkspaces = useWorkspaceStore((s) => s.isLoadingWorkspaces);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const [openMenuWorkspaceId, setOpenMenuWorkspaceId] = useState<string | null>(null);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const router = useRouter();

  const toCreatePage = () => {
    router.push("/workspaces/createworkspace");
  };

  if (isLoadingWorkspaces) {
    return <LoadingScreen />;
  }

  const redirectToWorkspace = (id: string) => {
    router.push(`/workspaces/${id}`);
  };

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    const shouldDelete = window.confirm(
      `Delete workspace "${workspaceName}"? This action cannot be undone.`
    );

    if (!shouldDelete) return;

    setDeletingWorkspaceId(workspaceId);
    try {
      await api.post(`/api/workspaces/${workspaceId}/delete`, {});
      const latestWorkspaces = useWorkspaceStore.getState().workspaces;
      setWorkspaces(latestWorkspaces.filter((workspace) => workspace.workspace_id !== workspaceId));
    } catch (error) {
      window.alert((error as Error).message || "Failed to delete workspace.");
    } finally {
      setDeletingWorkspaceId(null);
      setOpenMenuWorkspaceId(null);
    }
  };

  const getOwnerBadge = (ownerEmail: string | null | undefined, ownerId: string) => {
    const source = (ownerEmail && ownerEmail.trim()) ? ownerEmail.split("@")[0] : ownerId;
    const cleanSource = source.replace(/[^a-zA-Z0-9]/g, "");
    return cleanSource.slice(0, 2).toUpperCase() || "NA";
  };

  return (
    <div
      className="pb-12 px-10 max-w-7xl mx-auto pt-8"
      onClick={() => setOpenMenuWorkspaceId(null)}
    >
      {/* Header Section */}
      <div className="flex items-end justify-between mb-10 mt-2">
        <div>
          <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">Workspaces</h1>
          <p className="text-on-surface-variant font-body">Manage your collaborative environments and creative teams.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface-container-high rounded-lg font-manrope font-semibold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filter
          </button>
          <button
            onClick={toCreatePage}
            className="px-4 py-2 bg-gradient-to-br from-primary to-primary-dim rounded-lg font-manrope font-semibold text-sm text-white flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Create Workspace
          </button>
        </div>
      </div>

      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div onClick={toCreatePage} className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-all cursor-pointer group max-w-sm w-full bg-surface-container-lowest">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">Create New Workspace</h3>
            <p className="text-on-surface-variant text-sm font-body">Launch a new dedicated studio for your next big idea.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.filter(Boolean).map((ws, i) => {
            const canManageWorkspace = ws.role === "owner" || ws.role === "admin";
            const canDeleteWorkspace = ws.role === "owner";
            const ownerEmail = ws.owner_email ?? "Unknown owner";

            return (
              <div
                key={ws.workspace_id}
                onClick={() => redirectToWorkspace(ws.workspace_id)}
                className="bg-surface-container-lowest rounded-xl p-6 transition-all duration-300 border border-outline-variant/20 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:border-outline-variant/40 hover:-translate-y-1 group relative cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${COLORS[i % COLORS.length]}`}>
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {ICONS[i % ICONS.length]}
                    </span>
                  </div>

                  {canManageWorkspace && (
                    <div className="relative" onClick={(event) => event.stopPropagation()}>
                      <button
                        className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-container-low rounded"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuWorkspaceId((currentId) => currentId === ws.workspace_id ? null : ws.workspace_id);
                        }}
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>

                      {openMenuWorkspaceId === ws.workspace_id && (
                        <div className="absolute right-0 top-10 w-44 rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-lg z-20 p-1">
                          <button
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low rounded-md"
                            onClick={() => {
                              setOpenMenuWorkspaceId(null);
                              router.push(`/workspaces/edit/${ws.workspace_id}`);
                            }}
                          >
                            Edit workspace
                          </button>
                          {canDeleteWorkspace && (
                            <button
                              disabled={deletingWorkspaceId === ws.workspace_id}
                              className="w-full text-left px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/20 rounded-md disabled:opacity-50"
                              onClick={() => handleDeleteWorkspace(ws.workspace_id, ws.name)}
                            >
                              {deletingWorkspaceId === ws.workspace_id ? "Deleting..." : "Delete workspace"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="font-manrope font-bold text-lg text-on-surface mb-2">{ws.name}</h3>
                <p className="text-on-surface-variant text-sm font-body leading-relaxed line-clamp-2 mb-2">
                  {ws.description?.trim() || "No description provided."}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-6">
                  Role: <span className="text-on-surface">{ws.role}</span>
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/50">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary border-2 border-surface-container-lowest flex items-center justify-center text-[10px] font-bold text-white uppercase">
                      {getOwnerBadge(ws.owner_email, ws.owner_id)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-bold text-on-surface">Owner</span>
                    <span className="block text-[10px] text-on-surface-variant tracking-wide">{ownerEmail}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface" onClick={(e) => { e.stopPropagation(); redirectToWorkspace(ws.workspace_id); }}>
                    Enter Workspace
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add New Workspace Empty State Card */}
          <div onClick={toCreatePage} className="border-2 border-dashed border-outline-variant/30 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-all cursor-pointer group">
            <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <h3 className="font-manrope font-bold text-on-surface mb-1">Create New Workspace</h3>
            <p className="text-on-surface-variant text-xs font-body max-w-[200px]">Launch a new dedicated studio for your next big idea.</p>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

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

  return (
    <div className="pb-12 px-10 max-w-7xl mx-auto pt-8">
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
          {workspaces.filter(Boolean).map((ws, i) => (
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
                <button className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface-container-low rounded" onClick={(e) => e.stopPropagation()}>
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <h3 className="font-manrope font-bold text-lg text-on-surface mb-2">{ws.name}</h3>
              <p className="text-on-surface-variant text-sm font-body leading-relaxed mb-6 line-clamp-2">
                {ws.description || `Collaborative workspace for ${ws.name}.`}
                {" "}Role:
                <span className="uppercase text-xs font-bold">{ws.role}</span>
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/50">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-primary border-2 border-surface-container-lowest flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {ws.owner_id.substring(0, 2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-bold text-on-surface">Owner</span>
                  <span className="block text-[10px] text-on-surface-variant uppercase tracking-wider">{ws.owner_id}</span>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors text-xs font-bold text-on-surface" onClick={(e) => { e.stopPropagation(); redirectToWorkspace(ws.workspace_id); }}>
                  Enter Workspace
                </button>
                <button
  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high transition-colors text-on-surface-variant"
  onClick={(e) => {
    e.stopPropagation();
    router.push(`/workspaces/edit/${ws.workspace_id}`);
  }}
>
  <span className="material-symbols-outlined text-sm">edit</span>
</button>
              </div>
            </div>
          ))}

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

      {/* Mock Stats/Activity Section */}
      {workspaces.length > 0 && (
        <div className="mt-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-2xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-manrope font-extrabold text-on-surface">Recent Activity</h2>
              <button className="text-primary text-sm font-bold hover:underline">View All</button>
            </div>
            <div className="space-y-6">
              <div className="text-sm text-on-surface-variant italic">Activity feed will appear here as your team collaborates.</div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-primary to-primary-dim p-8 rounded-2xl text-white shadow-xl">
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-70">Workspace Insights</span>
              <div className="mt-4 mb-8">
                <span className="text-4xl font-manrope font-extrabold tracking-tighter">84%</span>
                <p className="text-sm opacity-80 mt-1">Utilization across all studios</p>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div className="bg-white h-full" style={{ width: "84%" }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

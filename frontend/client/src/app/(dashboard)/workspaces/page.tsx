"use client";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

const COLORS = [
  "from-[#6e81bd] to-[#5f95b2]",
  "from-[#7e79b4] to-[#6287b9]",
  "from-[#678eb5] to-[#5a9e9e]",
  "from-[#6f88a8] to-[#6c9a9c]",
  "from-[#8a7ba6] to-[#6e86a8]",
  "from-[#7f86ae] to-[#6f92b5]",
];

function roleBadgeClass(role: string) {
  if (role === "owner") return "sync-badge border-[rgba(82,108,176,0.35)] bg-[rgba(82,108,176,0.16)] text-[color:var(--accent-solid)]";
  if (role === "admin") return "sync-badge border-[rgba(82,138,162,0.35)] bg-[rgba(82,138,162,0.16)] text-[color:#3e7087]";
  return "sync-badge border-[color:var(--surface-border)] bg-[color:var(--surface-2)] text-[color:var(--text-secondary)]";
}

export default function WorkspacesPage() {
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const isLoadingWorkspaces = useWorkspaceStore((s) => s.isLoadingWorkspaces);
  const router = useRouter();

  const toCreatePage = () => {
    router.push("/workspaces/createworkspace");
  };

  if (isLoadingWorkspaces) {
    <LoadingScreen></LoadingScreen>;
  }

  const redirectToWorkspace = (id: string) => {
    router.push(`/workspaces/${id}`);
    <LoadingScreen></LoadingScreen>;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--surface-border)] pb-5">
        <div className="animate-[slideInRight_0.4s_ease_both]">
          <h1 className="sync-title mb-1 text-[1.85rem]">Workspaces</h1>
          <p className="text-sm text-[color:var(--text-muted)]">
            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <button
          className="sync-btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-[0.82rem] font-semibold animate-[slideInRight_0.4s_ease_0.1s_both]"
          onClick={toCreatePage}
        >
          <span className="text-lg leading-none">+</span> New workspace
        </button>
      </div>

      {workspaces.length === 0 ? (
        <div className="sync-card rounded-3xl p-12 text-center animate-[fadeUp_0.5s_ease_0.2s_both]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--surface-2)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[color:var(--text-muted)]">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="sync-title mb-2 text-[1.1rem]">No workspaces yet</h3>
          <p className="mx-auto max-w-[280px] text-sm text-[color:var(--text-muted)]">
            Create your first workspace to start collaborating with your team.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-5">
          {workspaces.map((ws, i) => (
            <div
              key={ws.id}
              onClick={() => redirectToWorkspace(ws.id)}
              className="sync-card group cursor-pointer rounded-3xl p-6"
              style={{ animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s both` }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${COLORS[i % COLORS.length]} font-[var(--font-heading)] text-[1.05rem] font-bold text-[color:var(--primary-foreground)] shadow-[0_6px_14px_rgba(60,85,136,0.28)] transition-transform duration-300 group-hover:scale-105`}>
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <span className={roleBadgeClass(ws.role)}>
                  {ws.role}
                </span>
              </div>

              <h3 className="sync-title mb-1.5 truncate text-[1.02rem] transition-colors group-hover:text-[color:var(--accent-solid)]">
                {ws.name}
              </h3>
              <p className="text-[0.82rem] text-[color:var(--text-muted)]">
                Created {new Date(ws.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>

              <div className="my-4 h-px bg-[color:var(--surface-border)]" />

              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface-2)] text-[0.68rem] font-bold text-[color:var(--text-secondary)]">
                  {ws.owner_id.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-xs font-medium text-[color:var(--text-muted)]">{ws.owner_id}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

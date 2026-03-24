"use client";
import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { createSlug } from "@/lib/workspaceSlug";
import { workspace } from "@/types";

interface response {
  workspace: workspace;
}

export default function CreateWorkspacePage() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const formSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    const name = workspaceName;
    const slug = workspaceSlug !== "" ? workspaceSlug : createSlug(name);
    try {
      const createWorkspace = await api.post("/api/workspaces/create", { name, slug }) as response;
      const addedWorkspace = createWorkspace.workspace;
      setWorkspaces([...workspaces, addedWorkspace]);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl py-3">
      <div className="mb-7 animate-[slideInRight_0.4s_ease_both]">
        <h1 className="sync-title mb-1.5 text-[1.85rem]">Create workspace</h1>
        <p className="text-sm text-[color:var(--text-muted)]">
          Set up a new workspace for your team to collaborate in.
        </p>
      </div>

      <div className="sync-card rounded-3xl p-7 md:p-8 animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]">
        <form onSubmit={formSubmitHandler}>
          <div className="mb-6 animate-[slideInRight_0.4s_ease_0.2s_both]">
            <label className="sync-label">Workspace name</label>
            <input
              type="text"
              required
              placeholder="e.g. Engineering Team"
              onChange={(e) => setWorkspaceName(e.target.value.trim())}
              className="sync-input"
            />
          </div>

          <div className="mb-8 animate-[slideInRight_0.4s_ease_0.25s_both]">
            <div className="mb-2 flex items-center justify-between">
              <label className="sync-label mb-0">Workspace URL slug</label>
              <span className="text-xs font-semibold text-[color:var(--text-muted)]">Optional</span>
            </div>
            <div className="flex items-stretch">
              <span className="sync-input-addon inline-flex items-center rounded-l-xl border-r-0 px-4 py-3">
                syncup.app/
              </span>
              <input
                type="text"
                placeholder={workspaceName ? createSlug(workspaceName) : "slug"}
                onChange={(e) => setWorkspaceSlug(e.target.value.trim())}
                className="sync-input rounded-l-none rounded-r-xl"
              />
            </div>
            <p className="mt-2.5 text-xs text-[color:var(--text-muted)]">
              Leave blank to auto-generate from the workspace name.
            </p>
          </div>

          {error && (
            <div className="sync-danger mb-6 rounded-xl px-4 py-3 animate-[shake_0.35s_ease]">
              <p className="flex items-center gap-2 text-sm font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-[color:var(--surface-border)] pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="sync-btn-primary float-right mt-2 w-full rounded-xl px-8 py-3.5 font-[var(--font-heading)] text-[0.95rem] font-semibold disabled:pointer-events-none disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-[2px] border-[rgba(236,241,255,0.35)] border-t-[color:var(--primary-foreground)] animate-[spin_0.8s_linear_infinite]" />
                  Creating...
                </span>
              ) : (
                "Create workspace"
              )}
            </button>
            <div className="clear-both" />
          </div>
        </form>
      </div>
    </div>
  );
}

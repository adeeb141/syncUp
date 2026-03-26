"use client";
import { useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { createSlug } from "@/lib/workspaceSlug";
import { workspacePageInfo } from "@/types";

interface response {
  workspace: workspacePageInfo;
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
    <div className="max-w-2xl py-8 px-10 mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">Create workspace</h1>
        <p className="text-on-surface-variant font-body">Set up a new workspace for your team to collaborate in.</p>
      </div>

      <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/5">
        <form onSubmit={formSubmitHandler}>
          <div className="mb-6">
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">Workspace name</label>
            <input
              type="text"
              required
              placeholder="e.g. Engineering Team"
              onChange={(e) => setWorkspaceName(e.target.value.trim())}
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>

          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-0 tracking-wider">Workspace URL slug</label>
              <span className="text-[10px] font-bold text-outline uppercase tracking-wider">Optional</span>
            </div>
            <div className="flex items-stretch focus-within:ring-2 focus-within:ring-primary/20 rounded-lg overflow-hidden transition-all filter drop-shadow-sm">
              <span className="bg-surface-container-high text-on-surface-variant inline-flex items-center px-4 py-3 text-sm font-semibold border-r border-outline-variant/10">
                syncup.app/
              </span>
              <input
                type="text"
                placeholder={workspaceName ? createSlug(workspaceName) : "slug"}
                onChange={(e) => setWorkspaceSlug(e.target.value.trim())}
                className="w-full bg-surface-container-low border-none px-4 py-3 text-sm text-on-surface font-semibold outline-none"
              />
            </div>
            <p className="mt-2 text-xs text-on-surface-variant">
              Leave blank to auto-generate from the workspace name.
            </p>
          </div>

          {error && (
            <div className="bg-error-container/20 border border-error/20 mb-6 rounded-xl px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-error">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-outline-variant/10 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-br from-primary to-primary-dim rounded-lg font-manrope font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Creating...
                </>
              ) : (
                "Create workspace"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

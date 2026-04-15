"use client";
import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { createSlug } from "@/lib/workspaceSlug";
import { workspacePageInfo } from "@/types";

type UpdateWorkspaceResponse = {
  message: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    description: string | null;
    created_at: string;
  };
};

export default function EditWorkspacePage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const { workspaces, setWorkspaces } = useWorkspaceStore();

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ✅ Load existing workspace
  useEffect(() => {
  if (!id || !workspaces?.length) return;

  const ws = workspaces.find((w) => w && w.workspace_id === id);

  if (ws) {
    setWorkspaceName(ws.name);
    setWorkspaceDescription(ws.description || "");
    setWorkspaceSlug(ws.slug || "");
  }
}, [id, workspaces]);

  const formSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      setError("Invalid workspace id.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const name = workspaceName;
    const slug = workspaceSlug !== "" ? workspaceSlug : createSlug(name);

    try {
      const res = await api.post<UpdateWorkspaceResponse>(`/api/workspaces/${id}/update`, {
        newName: name,
        newSlug: slug,
        description: workspaceDescription,
      });

      if (!res.workspace) {
        throw new Error("Update succeeded but workspace payload was missing.");
      }

      const updatedWorkspace = res.workspace;

      const updatedList: workspacePageInfo[] = workspaces.map((w) => {
        if (w.workspace_id !== id) return w;
        return {
          ...w,
          name: updatedWorkspace.name,
          slug: updatedWorkspace.slug,
          description: updatedWorkspace.description,
          owner_id: updatedWorkspace.owner_id,
          created_at: updatedWorkspace.created_at,
        };
      });

      setWorkspaces(updatedList);

      router.push("/workspaces");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl py-8 px-10 mx-auto w-full">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">
          Edit workspace
        </h1>
        <p className="text-on-surface-variant font-body">
          Update your workspace details.
        </p>
      </div>

      {/* Card */}
      <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/5">
        <form onSubmit={formSubmitHandler}>
          
          {/* Name */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">
              Workspace name
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Engineering Team"
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-[10px] font-bold uppercase text-on-surface-variant mb-2 tracking-wider">
              Workspace description
            </label>
            <textarea
              value={workspaceDescription}
              onChange={(e) => setWorkspaceDescription(e.target.value)}
              placeholder="Describe your workspace..."
              className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Slug */}
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
                Workspace URL slug
              </label>
              <span className="text-[10px] font-bold text-outline uppercase">
                Optional
              </span>
            </div>

            <div className="flex items-stretch focus-within:ring-2 focus-within:ring-primary/20 rounded-lg overflow-hidden transition-all filter drop-shadow-sm">
              <span className="bg-surface-container-high text-on-surface-variant inline-flex items-center px-4 py-3 text-sm font-semibold border-r border-outline-variant/10">
                syncup.app/
              </span>
              <input
                type="text"
                value={workspaceSlug}
                placeholder={
                  workspaceName ? createSlug(workspaceName) : "slug"
                }
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                className="w-full bg-surface-container-low border-none px-4 py-3 text-sm text-on-surface font-semibold outline-none"
              />
            </div>

            <p className="mt-2 text-xs text-on-surface-variant">
              Leave blank to auto-generate from the workspace name.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-container/20 border border-error/20 mb-6 rounded-xl px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-error">
                <span className="material-symbols-outlined text-lg">
                  error
                </span>
                {error}
              </p>
            </div>
          )}

          {/* Button */}
          <div className="mt-6 pt-6 border-t border-outline-variant/10 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-gradient-to-br from-primary to-primary-dim rounded-lg font-manrope font-bold text-sm text-white flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">
                    progress_activity
                  </span>
                  Updating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">
                    edit
                  </span>
                  Update workspace
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

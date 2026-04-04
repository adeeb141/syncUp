"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProjectStore } from "@/stores/projectStore";
import { project } from "@/types";

interface Props {
  workspaceId: string;
  onClose: () => void;
}

export function CreateProjectModal({ workspaceId, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { addProject } = useProjectStore();

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const newProject = await api.post<project>(
        `/api/workspaces/${workspaceId}/projects`,
        { name, description }
      );

      addProject(newProject);
      onClose();
    } catch (e: any) {
      console.log(e.response?.data || e.message);
      setError(e.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-8 relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="font-headline text-2xl font-extrabold text-on-surface mb-1">
          New Project
        </h2>
        <p className="text-on-surface-variant text-sm mb-6">
          Add a new project to your workspace.
        </p>

        {error && (
          <div className="bg-error-container/20 border border-error/20 text-error text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Branding Identity"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>

      </div>
    </div>
  );
}
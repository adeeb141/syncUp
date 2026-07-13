"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useMemberStore } from "@/stores/memberStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";

type AccessType = "view_only" | "open_collab" | "selective";
type AttachTo = "workspace" | "project" | "task";
type DocType = "text" | "whiteboard";

interface TaskOption {
  id: string;
  title: string;
}

interface Props {
  workspaceId: string;
  onClose: () => void;
}

const ACCESS_OPTIONS: { value: AccessType; label: string; icon: string; desc: string }[] = [
  { value: "open_collab", label: "Open Collab", icon: "group", desc: "All workspace members can edit" },
  { value: "view_only", label: "View Only", icon: "visibility", desc: "Members can view but not edit" },
  { value: "selective", label: "Selective", icon: "lock", desc: "Only chosen members can edit" },
];

const TYPE_OPTIONS: { value: DocType; label: string; icon: string; desc: string }[] = [
  { value: "text", label: "Document", icon: "description", desc: "Rich-text editor" },
  { value: "whiteboard", label: "Whiteboard", icon: "draw", desc: "Shapes on a shared canvas" },
];

const ATTACH_OPTIONS: { value: AttachTo; label: string; icon: string }[] = [
  { value: "workspace", label: "Workspace", icon: "workspaces" },
  { value: "project", label: "Project", icon: "folder" },
  { value: "task", label: "Task", icon: "task_alt" },
];

export function CreateDocumentModal({ workspaceId, onClose }: Props) {
  const router = useRouter();
  const workspaceMembers = useMemberStore((s) => s.members);
  const workspaceProjects = useProjectStore((s) => s.projects);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState<DocType>("text");
  const [access, setAccess] = useState<AccessType>("open_collab");
  const [attachTo, setAttachTo] = useState<AttachTo>("workspace");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch tasks when a project is selected and attachTo is "task"
  useEffect(() => {
    if (attachTo === "task" && selectedProjectId) {
      setTasksLoading(true);
      setSelectedTaskId("");
      api
        .get<{ tasks: TaskOption[] }>(`/api/workspaces/${selectedProjectId}/tasksinfo`)
        .then((data) => {
          setTasks(data.tasks);
        })
        .catch(() => setTasks([]))
        .finally(() => setTasksLoading(false));
    }
  }, [attachTo, selectedProjectId]);

  // Reset project/task when attachTo changes
  useEffect(() => {
    if (attachTo === "workspace") {
      setSelectedProjectId("");
      setSelectedTaskId("");
    }
    if (attachTo === "project") {
      setSelectedTaskId("");
    }
  }, [attachTo]);

  const toggleCollaborator = (userId: string) => {
    setSelectedCollaborators((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Document name is required.");
      return;
    }
    if (attachTo !== "workspace" && !selectedProjectId) {
      setError("Please select a project.");
      return;
    }
    if (attachTo === "task" && !selectedTaskId) {
      setError("Please select a task.");
      return;
    }
    if (access === "selective" && selectedCollaborators.length === 0) {
      setError("Select at least one collaborator for selective access.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const body: any = {
        name: name.trim(),
        description,
        access,
        type: docType,
      };
      if (attachTo !== "workspace") body.project_id = selectedProjectId;
      if (attachTo === "task") body.task_id = selectedTaskId;
      if (access === "selective") body.collaborator_ids = selectedCollaborators;

      const result = await api.post<{ document: { id: string; room_name: string; type: DocType } }>(
        `/api/documents/${workspaceId}`,
        body
      );

      onClose();
      const basePath = result.document.type === "whiteboard" ? "whiteboard" : "doc";
      router.push(
        `/workspaces/${workspaceId}/${basePath}/${result.document.id}?room=${encodeURIComponent(result.document.room_name)}`
      );
    } catch (e: any) {
      setError(e.message || "Failed to create document");
    } finally {
      setLoading(false);
    }
  };

  const otherMembers = workspaceMembers.filter((m) => m.user_id !== currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-8 relative max-h-[90vh] overflow-y-auto no-scrollbar animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              post_add
            </span>
          </div>
          <div>
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">New Document</h2>
            <p className="text-on-surface-variant text-xs">Create something collaborative in your workspace.</p>
          </div>
        </div>

        {error && (
          <div className="bg-error-container/20 border border-error/20 text-error text-sm rounded-lg p-3 mt-4">
            {error}
          </div>
        )}

        <div className="space-y-5 mt-6">
          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDocType(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                    docType === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-outline-variant/30 hover:border-outline-variant/60"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${docType === opt.value ? "text-primary" : "text-on-surface-variant"}`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {opt.icon}
                  </span>
                  <span className={`text-xs font-bold ${docType === opt.value ? "text-primary" : "text-on-surface"}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">
              Document Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint Planning Notes"
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this document..."
              rows={2}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition resize-none"
            />
          </div>

          {/* Access Control */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Access</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAccess(opt.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                    access === opt.value
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-outline-variant/30 hover:border-outline-variant/60"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg ${
                      access === opt.value ? "text-primary" : "text-on-surface-variant"
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      access === opt.value ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selective Collaborator Picker */}
          {access === "selective" && (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-2">
                Select Collaborators <span className="text-error">*</span>
              </label>
              {otherMembers.length === 0 ? (
                <p className="text-xs text-on-surface-variant">No other members in this workspace.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                  {otherMembers.map((m) => {
                    const selected = selectedCollaborators.includes(m.user_id);
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => toggleCollaborator(m.user_id)}
                        className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-outline-variant/40 text-on-surface-variant hover:border-outline-variant"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            selected
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {selected ? (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          ) : (
                            m.name?.charAt(0).toUpperCase() ?? "U"
                          )}
                        </div>
                        {m.name || "Unknown"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Attach To */}
          <div>
            <label className="block text-sm font-semibold text-on-surface mb-2">Attach To</label>
            <div className="flex gap-2">
              {ATTACH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAttachTo(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                    attachTo === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Selector */}
          {(attachTo === "project" || attachTo === "task") && (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Project</label>
              {workspaceProjects.length === 0 ? (
                <p className="text-xs text-on-surface-variant p-2 bg-surface-container-low rounded-lg">
                  No projects in this workspace yet.
                </p>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                >
                  <option value="">Select a project...</option>
                  {workspaceProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Task Selector */}
          {attachTo === "task" && selectedProjectId && (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">Task</label>
              {tasksLoading ? (
                <div className="flex items-center gap-2 p-2 text-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-on-surface-variant p-2 bg-surface-container-low rounded-lg">
                  No tasks in this project.
                </p>
              ) : (
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                >
                  <option value="">Select a task...</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Creating...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">post_add</span>
                Create Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useFileStore } from "@/stores/fileStore";
import {
  fetchFiles,
  uploadFile,
  deleteFile,
  getSignedFileUrl,
  formatFileSize,
  fileIcon,
  fileIconColor,
} from "@/lib/fileApi";
import { FileRecord } from "@/types";

interface FilePanelProps {
  workspaceId: string;
  projectId?: string;
  taskId?: string;
}

export function FilePanel({ workspaceId, projectId, taskId }: FilePanelProps) {
  const { files, isLoading, setFiles, addFile, removeFile, setLoading } =
    useFileStore();

  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load files on mount / when scope changes ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchFiles({ workspace_id: workspaceId, project_id: projectId, task_id: taskId });
        if (!cancelled) setFiles(data);
      } catch (e: any) {
        if (!cancelled) setFiles([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [workspaceId, projectId, taskId]);

  // ── Upload helpers ────────────────────────────────────────────────────────
  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of Array.from(picked)) {
        const record = await uploadFile({
          file,
          workspace_id: workspaceId,
          project_id: projectId,
          task_id: taskId,
        });
        addFile(record);
      }
    } catch (e: any) {
      setUploadError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await deleteFile(fileId);
      removeFile(fileId);
    } catch (e: any) {
      setUploadError(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Download via signed URL ───────────────────────────────────────────────
  const handleDownload = async (file: FileRecord) => {
    setDownloadingId(file.id);
    try {
      const url = await getSignedFileUrl(file.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      setUploadError(e.message ?? "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">

      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-base">attach_file</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Attachments
          </span>
          {files.length > 0 && (
            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm">upload</span>
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ── Error banner ───────────────────────────────────────────────── */}
      {uploadError && (
        <div className="bg-error-container/20 border border-error/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="text-xs text-error font-medium flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-error/60 hover:text-error">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* ── Drop zone ──────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all select-none
          ${dragOver
            ? "border-primary/60 bg-primary/5 scale-[1.01]"
            : "border-outline-variant/30 hover:border-primary/30 hover:bg-surface-container-low"
          }`}
      >
        {uploading ? (
          <>
            <span className="material-symbols-outlined text-2xl text-primary animate-spin" style={{ animationDuration: "1s" }}>
              progress_activity
            </span>
            <span className="text-xs text-on-surface-variant font-medium">Uploading…</span>
          </>
        ) : (
          <>
            <span className={`material-symbols-outlined text-2xl transition-colors ${dragOver ? "text-primary" : "text-outline"}`}>
              cloud_upload
            </span>
            <span className="text-xs font-semibold text-on-surface-variant text-center">
              {dragOver ? "Drop files here" : "Drag & drop or click to upload"}
            </span>
          </>
        )}
      </div>

      {/* ── File list ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-surface-container-low rounded-lg animate-pulse" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <p className="text-xs text-outline text-center py-2">No attachments yet.</p>
      ) : (
        <div className="space-y-1.5">
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              isDeleting={deletingId === file.id}
              isDownloading={downloadingId === file.id}
              onDelete={handleDelete}
              onDownload={handleDownload}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual file row ───────────────────────────────────────────────────────

function FileRow({
  file,
  isDeleting,
  isDownloading,
  onDelete,
  onDownload,
  formatDate,
}: {
  file: FileRecord;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: (id: string) => void;
  onDownload: (f: FileRecord) => void;
  formatDate: (s: string) => string;
}) {
  const [showActions, setShowActions] = useState(false);
  const iconName = fileIcon(file.type);
  const iconColor = fileIconColor(file.type);

  return (
    <div
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:bg-surface-container-low transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined text-base ${iconColor}`}>{iconName}</span>
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-on-surface truncate">{file.name}</p>
        <p className="text-[10px] text-outline">
          {formatFileSize(file.size)} · {formatDate(file.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => onDownload(file)}
          disabled={isDownloading}
          title="Download"
          className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
        >
          {isDownloading ? (
            <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: "1s" }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">download</span>
          )}
        </button>
        <button
          onClick={() => onDelete(file.id)}
          disabled={isDeleting}
          title="Delete"
          className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
        >
          {isDeleting ? (
            <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: "1s" }}>progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">delete</span>
          )}
        </button>
      </div>
    </div>
  );
}
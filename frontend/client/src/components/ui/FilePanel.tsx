"use client";

import { useEffect, useRef, useState } from "react";
import { useFileStore } from "@/stores/fileStore";
import {
  fetchFiles,
  uploadFile,
  deleteFile,
  getSignedFileUrl,
  validateFiles,
  formatFileSize,
  fileIcon,
  fileIconColor,
  PAGE_SIZE,
  MAX_FILE_SIZE_MB,
  type ValidationError,
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

  const [dragOver, setDragOver]         = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadErrors, setUploadErrors] = useState<ValidationError[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Pagination
  const [offset, setOffset]         = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setOffset(0);
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchFiles({
          workspace_id: workspaceId,
          project_id: projectId,
          task_id: taskId,
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (!cancelled) {
          setFiles(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch {
        if (!cancelled) setFiles([]);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [workspaceId, projectId, taskId]);

  // ── Load more (pagination) ────────────────────────────────────────────────
  const loadMore = async () => {
    const nextOffset = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await fetchFiles({
        workspace_id: workspaceId,
        project_id: projectId,
        task_id: taskId,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setFiles([...files, ...data]);
      setOffset(nextOffset);
      setHasMore(data.length === PAGE_SIZE);
    } catch (e: any) {
      setRuntimeError(e.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;

    // Reset previous errors
    setUploadErrors([]);
    setRuntimeError(null);

    // 1. Validate all files before any network call
    const { valid, errors } = validateFiles(Array.from(picked), files);

    if (errors.length > 0) setUploadErrors(errors);
    if (valid.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Upload only valid files
    setUploading(true);
    try {
      for (const file of valid) {
        const record = await uploadFile({
          file,
          workspace_id: workspaceId,
          project_id: projectId,
          task_id: taskId,
        });
        addFile(record);
      }
    } catch (e: any) {
      setRuntimeError(e.message ?? "Upload failed");
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
    setRuntimeError(null);
    try {
      await deleteFile(fileId);
      removeFile(fileId);
    } catch (e: any) {
      setRuntimeError(e.message ?? "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (file: FileRecord) => {
    setDownloadingId(file.id);
    setRuntimeError(null);
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
      setRuntimeError(e.message ?? "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const hasErrors = uploadErrors.length > 0 || runtimeError;

  return (
    <div className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-base">attach_file</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            Attachments
          </span>
          {files.length > 0 && (
            <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {files.length}{hasMore ? "+" : ""}
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

      {/* ── Allowed types hint ─────────────────────────────────────────── */}
      <p className="text-[10px] text-outline leading-relaxed">
        Images, PDF, Word, Excel, ZIP, video, audio · Max {MAX_FILE_SIZE_MB} MB per file
      </p>

      {/* ── Validation errors (per-file) ───────────────────────────────── */}
      {uploadErrors.length > 0 && (
        <div className="bg-error-container/20 border border-error/20 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-error text-sm">warning</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-error">
                {uploadErrors.length} file{uploadErrors.length > 1 ? "s" : ""} rejected
              </span>
            </div>
            <button onClick={() => setUploadErrors([])} className="text-error/60 hover:text-error">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          {uploadErrors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="material-symbols-outlined text-error/60 text-xs mt-0.5">cancel</span>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-on-surface truncate block">{e.file}</span>
                <span className="text-[10px] text-error/80">{e.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Runtime error (upload/delete/download failure) ─────────────── */}
      {runtimeError && (
        <div className="bg-error-container/20 border border-error/20 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-sm">error</span>
          <span className="text-xs text-error font-medium flex-1">{runtimeError}</span>
          <button onClick={() => setRuntimeError(null)} className="text-error/60 hover:text-error">
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
        <>
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

          {/* ── Load more ────────────────────────────────────────────── */}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 rounded-xl border border-outline-variant/20 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low hover:text-primary hover:border-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: "1s" }}>progress_activity</span>
                  Loading…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                  Load more files
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({
  file, isDeleting, isDownloading, onDelete, onDownload, formatDate,
}: {
  file: FileRecord;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: (id: string) => void;
  onDownload: (f: FileRecord) => void;
  formatDate: (s: string) => string;
}) {
  const [showActions, setShowActions] = useState(false);
  const iconName  = fileIcon(file.type);
  const iconColor = fileIconColor(file.type);

  return (
    <div
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-outline-variant/10 hover:border-primary/20 hover:bg-surface-container-low transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
        <span className={`material-symbols-outlined text-base ${iconColor}`}>{iconName}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-on-surface truncate">{file.name}</p>
        <p className="text-[10px] text-outline">
          {formatFileSize(file.size)} · {formatDate(file.created_at)}
        </p>
      </div>

      <div className={`flex items-center gap-1 transition-opacity ${showActions ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={() => onDownload(file)}
          disabled={isDownloading}
          title="Download"
          className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
        >
          {isDownloading
            ? <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: "1s" }}>progress_activity</span>
            : <span className="material-symbols-outlined text-sm">download</span>
          }
        </button>
        <button
          onClick={() => onDelete(file.id)}
          disabled={isDeleting}
          title="Delete"
          className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors disabled:opacity-50"
        >
          {isDeleting
            ? <span className="material-symbols-outlined text-sm animate-spin" style={{ animationDuration: "1s" }}>progress_activity</span>
            : <span className="material-symbols-outlined text-sm">delete</span>
          }
        </button>
      </div>
    </div>
  );
}
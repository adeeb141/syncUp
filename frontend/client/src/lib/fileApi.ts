import { FileRecord } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Upload a file (multipart/form-data — can't use the standard api helper) ──
export async function uploadFile(params: {
  file: File;
  workspace_id: string;
  project_id?: string;
  task_id?: string;
}): Promise<FileRecord> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("workspace_id", params.workspace_id);
  if (params.project_id) form.append("project_id", params.project_id);
  if (params.task_id) form.append("task_id", params.task_id);

  const res = await fetch(`${BASE_URL}/api/files/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
    // ⚠️ Do NOT set Content-Type — browser sets it automatically with boundary
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Upload failed");
  }

  const data = await res.json();
  return data.file as FileRecord;
}

// ── Get files (filtered by workspace / project / task) ──────────────────────
export async function fetchFiles(params: {
  workspace_id: string;
  project_id?: string;
  task_id?: string;
  limit?: number;
}): Promise<FileRecord[]> {
  const query = new URLSearchParams({ workspace_id: params.workspace_id });
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.task_id) query.set("task_id", params.task_id);
  if (params.limit) query.set("limit", String(params.limit));

  const res = await fetch(`${BASE_URL}/api/files?${query.toString()}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Failed to fetch files");
  }

  const data = await res.json();
  return data.files as FileRecord[];
}

// ── Delete a file ────────────────────────────────────────────────────────────
export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Delete failed");
  }
}

// ── Get a signed (temporary) download URL ───────────────────────────────────
export async function getSignedFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/files/${fileId}/url`, {
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Failed to get download URL");
  }

  const data = await res.json();
  return data.url as string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Return a human-readable file size string. */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Derive a Material Symbol icon name from a MIME type. */
export function fileIcon(mime: string | null): string {
  if (!mime) return "description";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "picture_as_pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv"))
    return "table_chart";
  if (mime.includes("word") || mime.includes("document")) return "article";
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("gz"))
    return "folder_zip";
  if (mime.startsWith("video/")) return "movie";
  if (mime.startsWith("audio/")) return "audio_file";
  if (mime.startsWith("text/")) return "code";
  return "description";
}

/** Accent colour class for the file icon. */
export function fileIconColor(mime: string | null): string {
  if (!mime) return "text-outline";
  if (mime.startsWith("image/")) return "text-tertiary";
  if (mime === "application/pdf") return "text-error";
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv"))
    return "text-secondary";
  if (mime.includes("word") || mime.includes("document")) return "text-primary";
  if (mime.startsWith("video/")) return "text-tertiary";
  return "text-outline";
}
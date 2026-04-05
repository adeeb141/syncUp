import { FileRecord } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

// ── Validation config ────────────────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Presentations
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Archives
  "application/zip", "application/x-zip-compressed",
  // Text / code
  "text/plain", "text/html", "text/markdown",
  // Video / audio
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav", "audio/ogg",
];

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export type ValidationError = { file: string; reason: string };

/**
 * Validate a list of picked files before uploading.
 * Returns { valid, errors } — valid files can proceed, errored ones are rejected.
 */
export function validateFiles(
  files: File[],
  existingFiles: FileRecord[]
): { valid: File[]; errors: ValidationError[] } {
  const valid: File[] = [];
  const errors: ValidationError[] = [];

  const existingNames = new Set(existingFiles.map((f) => f.name.toLowerCase()));

  for (const file of files) {
    // 1. Size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push({
        file: file.name,
        reason: `Exceeds ${MAX_FILE_SIZE_MB} MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      });
      continue;
    }

    // 2. Type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push({
        file: file.name,
        reason: `File type "${file.type || "unknown"}" is not allowed`,
      });
      continue;
    }

    // 3. Duplicate check (same name already attached to this task)
    if (existingNames.has(file.name.toLowerCase())) {
      errors.push({
        file: file.name,
        reason: "A file with this name already exists on this task",
      });
      continue;
    }

    valid.push(file);
  }

  return { valid, errors };
}

// ── Upload ───────────────────────────────────────────────────────────────────

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
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Upload failed");
  }

  const data = await res.json();
  return data.file as FileRecord;
}

// ── Get files (with optional pagination) ────────────────────────────────────

export const PAGE_SIZE = 10;

export async function fetchFiles(params: {
  workspace_id: string;
  project_id?: string;
  task_id?: string;
  limit?: number;
  offset?: number;
}): Promise<FileRecord[]> {
  const query = new URLSearchParams({ workspace_id: params.workspace_id });
  if (params.project_id) query.set("project_id", params.project_id);
  if (params.task_id) query.set("task_id", params.task_id);
  query.set("limit", String(params.limit ?? PAGE_SIZE));
  if (params.offset) query.set("offset", String(params.offset));

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

// ── Delete ───────────────────────────────────────────────────────────────────

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

// ── Signed URL ───────────────────────────────────────────────────────────────

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

// ── Display helpers ───────────────────────────────────────────────────────────

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
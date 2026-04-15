import { FileRecord } from "@/types";
import { create } from "zustand";

type FileStoreType = {
  files: FileRecord[];
  isLoading: boolean;
  setFiles: (files: FileRecord[]) => void;
  addFile: (file: FileRecord) => void;
  removeFile: (fileId: string) => void;
  setLoading: (value: boolean) => void;
  clearFiles: () => void;
};

const dedupeById = (files: FileRecord[]) => {
  const seen = new Set<string>();
  const unique: FileRecord[] = [];

  for (const file of files) {
    if (seen.has(file.id)) continue;
    seen.add(file.id);
    unique.push(file);
  }

  return unique;
};

export const useFileStore = create<FileStoreType>((set) => ({
  files: [],
  isLoading: false,

  setFiles: (files) => set({ files: dedupeById(files), isLoading: false }),

  addFile: (file) =>
    set((state) => ({
      files: dedupeById([file, ...state.files]),
    })),

  removeFile: (fileId) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== fileId) })),

  setLoading: (value) => set({ isLoading: value }),

  clearFiles: () => set({ files: [], isLoading: false }),
}));

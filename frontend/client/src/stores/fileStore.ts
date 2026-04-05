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

export const useFileStore = create<FileStoreType>((set) => ({
  files: [],
  isLoading: false,

  setFiles: (files) => set({ files, isLoading: false }),

  addFile: (file) =>
    set((state) => ({ files: [file, ...state.files] })),

  removeFile: (fileId) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== fileId) })),

  setLoading: (value) => set({ isLoading: value }),

  clearFiles: () => set({ files: [], isLoading: false }),
}));
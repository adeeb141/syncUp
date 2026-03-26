import { tasks } from "@/types";
import { create } from "zustand";

export type TaskRow = tasks & {
  assignee_name: string | null;
  created_by_name: string | null;
  updated_at: string;
};

type TaskStoreType = {
  tasks: TaskRow[];
  currentProjectId: string | null;
  isLoading: boolean;
  setTasks: (projectId: string, tasks: TaskRow[]) => void;
  clearTasks: () => void;
  addTask: (task: TaskRow) => void;
  updateTask: (taskId: string, updates: Partial<TaskRow>) => void;
  removeTask: (taskId: string) => void;
  setLoading: (value: boolean) => void;
};

export const useTaskStore = create<TaskStoreType>((set) => ({
  tasks: [],
  currentProjectId: null,
  isLoading: true,

  setTasks: (projectId, tasks) => {
    set({ tasks, currentProjectId: projectId, isLoading: false });
  },

  clearTasks: () => {
    set({ tasks: [], currentProjectId: null, isLoading: false });
  },

  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
  },

  updateTask: (taskId, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },

  setLoading: (value) => {
    set({ isLoading: value });
  },
}));

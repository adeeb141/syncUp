import { project } from "@/types";
import { create } from "zustand";

type ProjectStoreType = {
  projects: project[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  setProjects: (workspaceId: string, projects: project[]) => void;
  clearProjects: () => void;
  addProject: (project: project) => void;
  updateProject: (projectId: string, updates: Partial<project>) => void;
  removeProject: (projectId: string) => void;
  setLoading: (value: boolean) => void;
};

export const useProjectStore = create<ProjectStoreType>((set) => ({
  projects: [],
  currentWorkspaceId: null,
  isLoading: true,

  setProjects: (workspaceId, projects) => {
    set({ projects, currentWorkspaceId: workspaceId, isLoading: false });
  },

  clearProjects: () => {
    set({ projects: [], currentWorkspaceId: null, isLoading: false });
  },

  addProject: (project) => {
    set((state) => {
      if (state.currentWorkspaceId !== project.workspace_id) return state;

      const exists = state.projects.some((p) => p.id === project.id);
      if (exists) return state;

      return { projects: [project, ...state.projects] };
    });
  },

  updateProject: (projectId, updates) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      ),
    }));
  },

  removeProject: (projectId) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
    }));
  },

  setLoading: (value) => {
    set({ isLoading: value });
  },
}));

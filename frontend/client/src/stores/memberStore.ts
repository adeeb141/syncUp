import { workspace_member } from "@/types";
import { create } from "zustand";

type MemberStoreType = {
  members: workspace_member[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  setMembers: (workspaceId: string, members: workspace_member[]) => void;
  clearMembers: () => void;
  addMember: (member: workspace_member) => void;
  removeMember: (userId: string) => void;
  setLoading: (value: boolean) => void;
};

export const useMemberStore = create<MemberStoreType>((set) => ({
  members: [],
  currentWorkspaceId: null,
  isLoading: true,

  setMembers: (workspaceId, members) => {
    set({ members, currentWorkspaceId: workspaceId, isLoading: false });
  },

  clearMembers: () => {
    set({ members: [], currentWorkspaceId: null, isLoading: false });
  },

  addMember: (member) => {
    set((state) => ({ members: [...state.members, member] }));
  },

  removeMember: (userId) => {
    set((state) => ({
      members: state.members.filter((m) => m.user_id !== userId),
    }));
  },

  setLoading: (value) => {
    set({ isLoading: value });
  },
}));

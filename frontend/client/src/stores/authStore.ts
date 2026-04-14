import { User } from "@/types";
import { create } from "zustand";
import { api } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useMemberStore } from "@/stores/memberStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTaskStore } from "@/stores/taskStore";
import { useNotificationStore } from "@/stores/notificationStore";

type StoreType = {
  user:User | null;
  isLoading:boolean,
  setAuth:(user:User)=>void,
  setLoading:(value:boolean)=>void,
  logout:()=>Promise<void>;
};

const clearSessionStores = () => {
  useWorkspaceStore.getState().clearWorkspaces();
  useMemberStore.getState().clearMembers();
  useProjectStore.getState().clearProjects();
  useTaskStore.getState().clearTasks();
  useNotificationStore.getState().clearAll();
};

export const useAuthStore = create<StoreType>((set, get) => ({
  user:null,
  isLoading:true,
  setAuth :(user)=>{
    const previousUserId = get().user?.id;
    if (previousUserId && previousUserId !== user.id) {
      clearSessionStores();
    }
    set({
        user,
    })
    },
  setLoading :(value)=>{
    set({isLoading:value})
  },
  logout :async ()=>{
    try {
      await api.post("/api/auth/logout", {});
    } catch (error) {
       console.error("Logout failed:", error);
    } finally {
      clearSessionStores();
      set({
          user:null,
          isLoading:false
      })
    }
  }
}));

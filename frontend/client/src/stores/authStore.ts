import { User } from "@/types";
import { create } from "zustand";
import { api } from "@/lib/api";

type StoreType = {
  user:User | null;
  isLoading:boolean,
  setAuth:(user:User)=>void,
  setLoading:(value:boolean)=>void,
  logout:()=>Promise<void>;
};

export const useAuthStore = create<StoreType>((set) => ({
  user:null,
  isLoading:true,
  setAuth :(user)=>{
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
      set({
          user:null,
          isLoading:false
      })
    }
  }
}));
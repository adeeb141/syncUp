import { User } from "@/types";
import { create } from "zustand";

type StoreType = {
  user:User | null;
  isLoading:boolean,
  setAuth:(user:User)=>void,
  setLoading:(value:boolean)=>void,
  logout:()=>void;

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
  logout :()=>{
    set({
        user:null,
        isLoading:false
    })
  }
}));
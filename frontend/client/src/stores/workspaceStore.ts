import { workspace } from "@/types";
import {create} from "zustand";

type StoreType={
   workspaces:workspace[],
   isLoadingWorkspaces:boolean,
   setWorkspaces:(fetchResult:workspace[])=>void,
   setLoadingWorkspaces:(value:boolean)=>void
}

export const useWorkspaceStore= create<StoreType>((set)=>({
   workspaces:[],
   isLoadingWorkspaces:true,
   setWorkspaces:(fetchResult:workspace[])=>{
       set({workspaces:fetchResult})
   },
   setLoadingWorkspaces:(value:boolean)=>{
    set({isLoadingWorkspaces:value})
   }
}))
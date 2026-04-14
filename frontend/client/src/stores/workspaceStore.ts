import { workspacePageInfo } from "@/types";
import {create} from "zustand";

type StoreType={
   workspaces:workspacePageInfo[],
   isLoadingWorkspaces:boolean,
   setWorkspaces:(fetchResult:workspacePageInfo[])=>void,
   setLoadingWorkspaces:(value:boolean)=>void,
   clearWorkspaces:()=>void
}

export const useWorkspaceStore= create<StoreType>((set)=>({
   workspaces:[],
   isLoadingWorkspaces:true,
   setWorkspaces:(fetchResult:workspacePageInfo[])=>{
       set({workspaces:fetchResult})
   },
   setLoadingWorkspaces:(value:boolean)=>{
    set({isLoadingWorkspaces:value})
   },
   clearWorkspaces:()=>{
    set({
      workspaces:[],
      isLoadingWorkspaces:true
    })
   }
}))

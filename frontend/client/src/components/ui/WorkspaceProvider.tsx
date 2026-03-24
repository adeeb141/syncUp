"use client"
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { workspacePageInfo } from "@/types";
import { useEffect } from "react";
export const WorkspaceProvider=()=>{
   const{setWorkspaces,setLoadingWorkspaces}=useWorkspaceStore();
   interface workspacesObject{
    workspaces:workspacePageInfo[]
   }
   useEffect(()=>{
    console.log("Hello");
    const fetchWorkspace=async()=>{
        try{
            const workspacesObject=await api.get("/api/workspaces/getuserworkspaces") as workspacesObject;
            const workspaces=workspacesObject.workspaces;
            setWorkspaces(workspaces);
        }catch(error){
           console.log(error);
        }finally{
           setLoadingWorkspaces(false);
        }
    }
    fetchWorkspace();
   },[]) ;
   return null;
}
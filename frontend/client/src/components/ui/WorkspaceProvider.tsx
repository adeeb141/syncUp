"use client"
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { workspacePageInfo } from "@/types";
import { useEffect, useRef } from "react";
export const WorkspaceProvider=()=>{
   const{setWorkspaces,setLoadingWorkspaces}=useWorkspaceStore();
   const hasFetched = useRef(false);
   interface workspacesObject{
    workspaces:workspacePageInfo[]
   }
   useEffect(()=>{
      console.log("Hello");
    if (hasFetched.current) return;
    hasFetched.current = true;
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
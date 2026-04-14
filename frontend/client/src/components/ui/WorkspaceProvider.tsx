"use client"
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { api } from "@/lib/api";
import { workspacePageInfo } from "@/types";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
export const WorkspaceProvider=()=>{
   const{setWorkspaces,setLoadingWorkspaces,clearWorkspaces}=useWorkspaceStore();
   const userId = useAuthStore((s) => s.user?.id);
   interface workspacesObject{
    workspaces:workspacePageInfo[]
   }
   useEffect(()=>{
    if (!userId) {
      clearWorkspaces();
      return;
    }

    let cancelled = false;
    const fetchWorkspace=async()=>{
        setLoadingWorkspaces(true);
        try{
            const workspacesObject=await api.get("/api/workspaces/getuserworkspaces") as workspacesObject;
            const workspaces=workspacesObject.workspaces;
            if (cancelled) return;
            setWorkspaces(workspaces);
        }catch(error){
           console.log(error);
           if (cancelled) return;
           setWorkspaces([]);
        }finally{
           if (cancelled) return;
           setLoadingWorkspaces(false);
        }
    }
    fetchWorkspace();

   return () => {
    cancelled = true;
   };
   },[userId, clearWorkspaces, setLoadingWorkspaces, setWorkspaces]) ;
   return null;
}

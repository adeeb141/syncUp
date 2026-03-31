"use client";
import { useParams, useRouter } from "next/navigation";
import { workspace_member, project } from "@/types";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ManageMembersModal } from "@/components/ui/modals/ManageMembersModal";
import { useProjectStore } from "@/stores/projectStore";
import { useMemberStore } from "@/stores/memberStore";

interface ApiResponse {
  workspaceMembers: workspace_member[];
  workspaceProjects: project[];
}

const PROJECT_COLORS = [
  "bg-tertiary-container/20 text-tertiary",
  "bg-secondary-container text-on-secondary-container",
  "bg-primary-container text-primary",
  "bg-error-container/20 text-error",
];
const PROJECT_ICONS = [
  "design_services", "terminal", "folder", "analytics"
];

export default function WorkspaceIdPage() {
  const { workspaceId } = useParams();
  const workspaceIdParam = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  // Read from Zustand stores
  const workspaceProjects = useProjectStore((s) => s.projects);
  const projectsLoading = useProjectStore((s) => s.isLoading);
  const { setProjects, setLoading: setProjectsLoading } = useProjectStore();

  const workspaceMembers = useMemberStore((s) => s.members);
  const membersLoading = useMemberStore((s) => s.isLoading);
  const { setMembers, setLoading: setMembersLoading } = useMemberStore();

  const [error, setError] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const router = useRouter();

  const isLoading = projectsLoading || membersLoading;

  useEffect(() => {
    if (!workspaceIdParam) {
      return;
    }

    const fetchWorkspaceInfo = async () => {
      setProjectsLoading(true);
      setMembersLoading(true);
      try {
        const response = await api.get<ApiResponse>(`/api/workspaces/${workspaceIdParam}/getinfo`);
        setMembers(workspaceIdParam, response.workspaceMembers);
        setProjects(workspaceIdParam, response.workspaceProjects);
        setError(false);
      } catch (e) {
        console.log(e);
        setError(true);
        setProjectsLoading(false);
        setMembersLoading(false);
      }
    };

    fetchWorkspaceInfo();
  }, [workspaceIdParam]);

  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="p-10 space-y-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Daily Overview</h2>
          <p className="text-on-surface-variant mt-1 font-medium">Welcome back, your workspace is seeing high activity today.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link 
            href={`/workspaces/${workspaceIdParam}/doc/new`}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-sm">post_add</span>
            Create Document
          </Link>
          <span className="bg-secondary-container text-on-secondary-container px-3 py-2 rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            +12% Productivity
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl border border-error/20 p-4 text-sm text-error">
          Failed to load workspace data.
        </div>
      )}

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Large Feature Stat */}
        <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-on-surface-variant text-sm font-medium uppercase tracking-wider">Total Members</p>
              <h3 className="font-headline text-5xl font-extrabold text-primary mt-2">{workspaceMembers.length}</h3>
            </div>
            <div className="bg-primary-container p-3 rounded-lg">
              <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-xs font-bold text-on-surface-variant">+{workspaceMembers.length}</div>
            </div>
            <p className="text-xs text-on-surface-variant self-center font-medium">Active team members</p>
          </div>
          <div className="mt-4">
             <button onClick={() => setShowMembers(!showMembers)} className="text-sm font-bold text-primary hover:underline transition-all">
                {showMembers ? "Hide Members" : "Manage Members"}
             </button>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="bg-surface-container-low p-6 rounded-xl flex flex-col justify-center">
          <p className="text-on-surface-variant text-sm font-medium">Projects</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-headline text-3xl font-bold">{workspaceProjects.length}</span>
            <span className="text-secondary text-xs font-bold">+1 new</span>
          </div>
        </div>

        <div className="bg-error-container/10 p-6 rounded-xl border border-error-container/10 flex flex-col justify-center">
          <p className="text-error font-semibold text-sm">Due Soon</p>
          <div className="flex items-center gap-3 mt-1 text-error">
            <span className="font-headline text-3xl font-bold">12</span>
            <span className="material-symbols-outlined">priority_high</span>
          </div>
        </div>
      </div>
      
      {showMembers && (
        <div className="bg-surface-container-low rounded-xl p-6 transition-all duration-300">
           <h4 className="font-headline text-lg font-bold text-on-surface mb-4">Workspace Members</h4>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {workspaceMembers.map(member => (
                   <div key={member.user_id} className="bg-surface-container-lowest p-4 rounded-lg flex items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{member.name?.charAt(0).toUpperCase() ?? "U"}</div>
                       <div>
                           <p className="text-sm font-bold text-on-surface">{member.name}</p>
                           <p className="text-xs text-on-surface-variant uppercase">{member.role}</p>
                       </div>
                   </div>
               ))}
           </div>
           <button 
             onClick={() => setShowManageMembersModal(true)}
             className="mt-4 bg-primary text-white text-xs font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
           >
               Invite New Member
           </button>
        </div>
      )}

      {/* Content Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-headline text-xl font-bold text-on-surface">Recent Projects</h4>
            <button className="text-sm text-primary font-bold hover:underline">View All</button>
          </div>
          
          {workspaceProjects.length === 0 ? (
             <div className="border-2 border-dashed border-outline-variant/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-4">
                 <span className="material-symbols-outlined text-3xl">add</span>
               </div>
               <h3 className="font-manrope font-bold text-on-surface mb-1 text-lg">No Active Projects</h3>
               <p className="text-on-surface-variant text-sm font-body mb-4">You have no projects in this workspace yet.</p>
               <button className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm">Create Project</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaceProjects.map((projectItem, index) => (
                <div 
                  key={projectItem.id} 
                  onClick={() => router.push(`/workspaces/${workspaceIdParam}/projects/${projectItem.id}`)}
                  className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/5 hover:shadow-md transition-shadow group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`}>
                      <span className="material-symbols-outlined">{PROJECT_ICONS[index % PROJECT_ICONS.length]}</span>
                    </div>
                    <span className="bg-surface-container-high px-2 py-1 rounded text-[10px] font-bold uppercase text-on-surface-variant">{projectItem.status}</span>
                  </div>
                  <h5 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">{projectItem.name}</h5>
                  <p className="text-on-surface-variant text-xs mt-1 mb-4 line-clamp-2 min-h-[2rem]">{projectItem.description || "No description provided."}</p>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden mr-4">
                      <div className="bg-tertiary w-[50%] h-full rounded-full"></div>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant">50%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Deadlines */}
          <div className="pt-4 space-y-4">
            <h4 className="font-headline text-xl font-bold text-on-surface">Upcoming Deadlines</h4>
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/5">
              <div className="divide-y divide-outline-variant/10">
                <div className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-error-container/10 rounded-lg">
                      <span className="text-[10px] font-extrabold text-error">OCT</span>
                      <span className="text-lg font-headline font-bold text-error leading-none">24</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm">Final Design Review</p>
                      <p className="text-on-surface-variant text-xs">Studio Workspace Project</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-error">Tomorrow</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Sidebar (1/3 width) */}
        <div className="space-y-6">
          <h4 className="font-headline text-xl font-bold text-on-surface">Recent Activity</h4>
          <div className="relative bg-surface-container-low rounded-xl p-6">
            <div className="space-y-8 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-outline-variant opacity-20"></div>
              
              <div className="relative flex gap-4">
                <div className="z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-on-primary">upload</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    <span className="font-bold text-on-surface">Alex Rivera</span> uploaded 4 new assets to <span className="text-primary font-bold">Branding Identity</span>
                  </p>
                  <p className="text-[10px] text-outline mt-1">2 hours ago</p>
                </div>
              </div>

              <div className="relative flex gap-4">
                <div className="z-10 w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[12px] text-on-secondary">check</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                    <span className="font-bold text-on-surface">Sarah Chen</span> completed the task <span className="font-bold italic text-on-surface">Database Migration</span>
                  </p>
                  <p className="text-[10px] text-outline mt-1">5 hours ago</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-2 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded transition-colors uppercase tracking-widest">Load More Activity</button>
          </div>

          {/* Workload Card */}
          <div className="bg-primary text-on-primary p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-dim rounded-full opacity-50 blur-2xl"></div>
            <h5 className="font-bold text-lg mb-4">Workspace Health</h5>
            <p className="text-sm opacity-80 mb-6">Your team is currently at capacity. You have room for 2 more small projects.</p>
            <button className="w-full bg-white text-primary font-bold py-2 rounded-lg text-sm">Review Resource Plan</button>
          </div>
        </div>
      </div>
      
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 group z-50">
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="absolute right-16 bg-on-surface text-surface text-xs font-bold py-1 px-3 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">New Task</span>
      </button>

      {showManageMembersModal && <ManageMembersModal onClose={() => setShowManageMembersModal(false)} />}
    </div>
  );
}

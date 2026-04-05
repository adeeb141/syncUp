import React, { useState, useEffect } from "react";
import { useMemberStore } from "@/stores/memberStore";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";
import { UUID } from "crypto";
import { workspace_member } from "@/types";
interface User {
  id:UUID,
  name: string;
  email: string;
  isInvited?: boolean;
}
interface Res{
  users:User[]
}
export function ManageMembersModal({ onClose }: { onClose?: () => void }) {
  const members = useMemberStore((store) => store.members);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUserRole = members.find((m) => m.user_id === currentUserId)?.role;

  const {workspaceId}=useParams();
  const [emailSearch, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [removingMemberIds, setRemovingMemberIds] = useState<Record<string, boolean>>({});
  
  // Maps user email to their invite status: undefined | "loading" | "success" | "error"
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, "loading" | "success" | "error">>({});

  const handleRemoveMember = async (userId: string) => {
    setRemovingMemberIds((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.post(`/api/workspaces/${workspaceId}/removemember`, { user_id: userId });
      // The memberStore handles real-time removal through SocketProvider MEMBER_REMOVED
    } catch (err) {
      console.log(err);
    } finally {
      setRemovingMemberIds((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleInvite = async (email: string) => {
    setInviteStatuses((prev) => ({ ...prev, [email]: "loading" }));
    try{
      const sendInvite=await api.post("/api/invite/sendinvite",{workspace_id:workspaceId,invited_user_email:email});
      setInviteStatuses((prev) => ({ ...prev, [email]: "success" }));
    }
    catch(err){
      setInviteStatuses((prev) => ({ ...prev, [email]: "error" }));
    }
    
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(emailSearch);
    }, 400);

    return () => clearTimeout(timer);
  }, [emailSearch]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!debouncedEmail) {
        setSearchedUsers([]);
        setHasSearched(false);
        return;
      }

      try {
        setLoading(true);
        setHasSearched(true);

        const res = await api.post(`/api/utility/getusers/${workspaceId}`, {
          email: debouncedEmail,
        }) as Res;
        
        console.log(res);
        
        setSearchedUsers(res.users);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedEmail]);

  return (
    <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
        
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-lowest">
          <h3 className="font-headline font-extrabold text-xl text-on-surface tracking-tight">
            Manage Members
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container/20 hover:text-error transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <input
              type="email"
              placeholder="Email address..."
              className="flex-1 bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={emailSearch}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="bg-surface-container-low border-none rounded-lg px-4 py-3 text-sm text-on-surface font-semibold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none cursor-pointer">
              <option>Owner</option>
              <option>Admin</option>
              <option>Member</option>
            </select>
            <button className="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
              Invite
            </button>
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
            {!hasSearched ? "Current Members" : "Search Results"}
          </h4>

          <div className="space-y-4 min-h-[300px] max-h-[400px] overflow-y-auto pr-2">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-on-surface-variant animate-pulse">Searching...</p>
              </div>
            )}

            {/* No users found */}
            {!loading && hasSearched && searchedUsers.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <p className="text-sm text-on-surface-variant">No users found</p>
              </div>
            )}

            {/* Search results */}
            {!loading && searchedUsers.length > 0 &&
              searchedUsers.map((user) => (
                <div
                  key={user.email}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                      {user.name?.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{user.name}</p>
                      <p className="text-xs text-on-surface-variant">{user.email}</p>
                    </div>
                  </div>
                  
                  {/* Invite Button/Status */}
                  <div className="flex items-center">
                    {inviteStatuses[user.email] === "success" || user.isInvited ? (
                      <span className="material-symbols-outlined text-green-500 animate-in zoom-in duration-300">check_circle</span>
                    ) : (
                      <button 
                        className={`text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors ${inviteStatuses[user.email] === 'loading' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleInvite(user.email)}
                        disabled={inviteStatuses[user.email] === 'loading'}
                      >
                        {inviteStatuses[user.email] === 'loading' ? 'Inviting...' : 'Invite'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

            {/* Current members */}
            {!hasSearched &&
              members.map((member: workspace_member) => {
                const canRemove =
                  (currentUserRole === "admin" || currentUserRole === "owner") &&
                  member.role !== "owner" &&
                  member.user_id !== currentUserId;
                return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                      {member.name?.split(" ").map((w: string) => w[0]).join("")}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{member.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        <span className="text-outline mx-1">•</span>
                        <span className="text-primary font-bold">{member.role}</span>
                      </p>
                    </div>
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={removingMemberIds[member.user_id]}
                      className={`text-xs bg-error/10 text-error hover:bg-error hover:text-white px-3 py-1.5 rounded-lg font-bold transition-colors opacity-0 group-hover:opacity-100 ${removingMemberIds[member.user_id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {removingMemberIds[member.user_id] ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              )})}
          </div>
        </div>
      </div>
    </div>
  );
}
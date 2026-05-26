"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

export default function UserSettingsPage() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  // Profile fields state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  // Password fields state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // Delete account modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Initialize profile form with user details
  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
    }
  }, [user]);

  if (isLoading || user == null) {
    return <LoadingScreen />;
  }

  // Profile form submission (Mocked as not functional yet)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSubmitting(true);

    // Simulate standard latency for a premium feel
    setTimeout(() => {
      pushNotification({
        id: Math.random().toString(),
        message: "Profile details update (Name & Email) is not yet implemented. This will be available in a future release.",
        type: "info",
      });
      setIsProfileSubmitting(false);
    }, 600);
  };

  // Password change submission (Fully functional and wired to backend controller)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      pushNotification({
        id: Math.random().toString(),
        message: "Please fill in all password fields.",
        type: "error",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      pushNotification({
        id: Math.random().toString(),
        message: "New passwords do not match. Please verify your typing.",
        type: "error",
      });
      return;
    }

    if (newPassword.length < 6) {
      pushNotification({
        id: Math.random().toString(),
        message: "New password must be at least 6 characters long.",
        type: "warning",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const response = await api.post<{ message: string }>("/api/user/changepassword", {
        oldPassword,
        newPassword,
      });

      pushNotification({
        id: Math.random().toString(),
        message: response?.message || "Password updated successfully!",
        type: "success",
      });

      // Reset password fields
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      pushNotification({
        id: Math.random().toString(),
        message: message,
        type: "error",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  // Mock delete account submission
  const handleDeleteAccount = () => {
    setIsDeleteModalOpen(false);
    pushNotification({
      id: Math.random().toString(),
      message: "Account deletion is restricted to workspace owners. Please contact SyncUp platform administrators.",
      type: "warning",
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-[fadeUp_0.5s_ease_both]">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-manrope font-extrabold text-on-surface tracking-tight mb-2">
          Account Settings
        </h1>
        <p className="text-on-surface-variant font-body">
          Manage your personal details, profile security, and account preferences.
        </p>
      </div>

      {/* ── Main Layout Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card & Quick Navigation */}
        <div className="md:col-span-1 space-y-6">
          
          {/* Profile Overview Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/15 shadow-sm text-center flex flex-col items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-tertiary" />
            
            <div className="w-24 h-24 rounded-full bg-primary-gradient text-white flex items-center justify-center font-headline text-3xl font-bold shadow-md relative group select-none">
              {user.name.charAt(0).toUpperCase()}
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="material-symbols-outlined text-white text-lg">edit</span>
              </div>
            </div>

            <div>
              <h3 className="font-headline font-extrabold text-xl text-on-surface leading-snug">{user.name}</h3>
              <p className="text-sm text-on-surface-variant mt-1 truncate max-w-full px-2">{user.email}</p>
            </div>

            {user.is_verified ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                <span className="material-symbols-outlined text-xs">verified</span> Verified Account
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                <span className="material-symbols-outlined text-xs">pending</span> Unverified
              </span>
            )}

            <div className="w-full border-t border-outline-variant/10 pt-4 mt-2">
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Member Since</p>
              <p className="text-sm font-semibold text-on-surface mt-1">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/15 shadow-sm hidden md:flex flex-col gap-1">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-3 mb-2">Sections</h4>
            <button
              onClick={() => document.getElementById("profile-settings")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-left"
            >
              <span className="material-symbols-outlined text-lg">person</span> Profile Information
            </button>
            <button
              onClick={() => document.getElementById("security-settings")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all text-left"
            >
              <span className="material-symbols-outlined text-lg">shield</span> Password & Security
            </button>
            <button
              onClick={() => document.getElementById("danger-settings")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-error hover:bg-error-container/10 transition-all text-left"
            >
              <span className="material-symbols-outlined text-lg">delete</span> Danger Zone
            </button>
          </div>

        </div>

        {/* Right Column: Settings Forms */}
        <div className="md:col-span-2 space-y-6">

          {/* Profile Information Settings */}
          <div
            id="profile-settings"
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden scroll-mt-6"
          >
            <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-low/40">
              <h3 className="font-headline font-bold text-on-surface text-lg">Profile Information</h3>
              <p className="text-xs text-on-surface-variant mt-1">Update your account name and email address.</p>
            </div>
            
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isProfileSubmitting}
                  className="rounded-xl py-2.5 px-6 font-headline text-sm font-semibold bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-75 disabled:pointer-events-none"
                >
                  {isProfileSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm animate-[spin_0.8s_linear_infinite]">progress_activity</span> Saving Changes...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Settings */}
          <div
            id="security-settings"
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-hidden scroll-mt-6"
          >
            <div className="px-6 py-5 border-b border-outline-variant/10 bg-surface-container-low/40">
              <h3 className="font-headline font-bold text-on-surface text-lg">Password & Security</h3>
              <p className="text-xs text-on-surface-variant mt-1">Change your account password to secure your account.</p>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-5">
              <div>
                <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border-none bg-surface-container-highest/60 px-4 py-3 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPasswordSubmitting}
                  className="rounded-xl py-2.5 px-6 font-headline text-sm font-semibold bg-gradient-to-br from-primary to-primary-dim text-on-primary shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-75 disabled:pointer-events-none"
                >
                  {isPasswordSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm animate-[spin_0.8s_linear_infinite]">progress_activity</span> Updating Password...
                    </span>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone Settings */}
          <div
            id="danger-settings"
            className="bg-error/5 rounded-2xl border border-error/20 shadow-sm overflow-hidden scroll-mt-6"
          >
            <div className="px-6 py-5 border-b border-error/10 bg-error/10 flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-error text-lg">Danger Zone</h3>
                <p className="text-xs text-error/80 mt-1 font-medium">Permanently delete your account and all workspace data.</p>
              </div>
              <span className="material-symbols-outlined text-error text-2xl">warning</span>
            </div>
            
            <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="max-w-md">
                <p className="text-sm font-bold text-on-surface">Delete Account</p>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Once deleted, your account will be permanently closed and all data, files, and workspace configurations will be destroyed. This is non-reversible.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="rounded-xl py-2.5 px-6 font-headline text-sm font-semibold bg-error text-white hover:bg-error/95 active:scale-[0.98] transition-all shrink-0 shadow-sm"
              >
                Delete Account
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease_both]">
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 max-w-md w-full overflow-hidden shadow-2xl p-6 relative animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="flex items-center gap-3 mb-4 text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="font-headline font-extrabold text-xl">Delete Your Account?</h3>
            </div>
            
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              This action is extremely critical and will destroy all your profile data, project timelines, tasks, and file records. If you are sure, confirm below.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl py-2.5 px-4 text-sm font-semibold bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="rounded-xl py-2.5 px-4 text-sm font-semibold bg-error text-white hover:bg-error/95 transition-colors shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client"
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useEffect } from "react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  useEffect(() => {
    if (user) router.push("/workspaces");
  }, [user]);

  if (isLoading) return <LoadingScreen />;
  if (user) return <LoadingScreen />; // show loader while redirect happens
  return <>{children}</>;
}
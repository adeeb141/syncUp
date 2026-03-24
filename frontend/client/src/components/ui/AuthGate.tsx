"use client"
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "./LoadingScreen";
import { useEffect } from "react";
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthGate is running");
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (!user) {
    return <LoadingScreen />;
  }
  return <>{children}</>;
}
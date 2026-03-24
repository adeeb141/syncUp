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
    
    if (!user) router.push("/login");
  }, [user]);

  if (isLoading) {
    console.log(isLoading);
    return (
      <><LoadingScreen></LoadingScreen></>
    )
  }
  if (!user) {
    return (
      <><LoadingScreen></LoadingScreen></>
    )

  }
  return <>{children}</>;
}
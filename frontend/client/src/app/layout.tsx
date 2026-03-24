import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/ui/AuthProvider";
import { SocketProvider } from "@/components/ui/SocketProvider";
import { NotificationToast } from "@/components/ui/NotificationToast";
export const metadata: Metadata = {
  title: "SyncUp — Collaborate in Sync",
  description: "The modern workspace for teams to collaborate, manage projects, and stay in sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider/>
        <SocketProvider>
          <NotificationToast/>
           {children}
        </SocketProvider>
      </body>
    </html>
  );
}

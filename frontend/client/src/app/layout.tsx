import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/ui/AuthProvider";
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
         {children}
      </body>
    </html>
  );
}

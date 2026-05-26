import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ClarityInit } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "U:DO Craft — Адмін панель",
  description: "B2B мерч-автоматизація. Панель управління.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={cn()}>
      <body className="min-h-screen bg-background">
        <ClarityInit clarityId="w6t8md9b3l" />
        {children}
        <Toaster theme="light" toastOptions={{ style: { background: "white", border: "1px solid #e5e7eb", color: "#111827" } }} />
        <Analytics />
      </body>
    </html>
  );
}

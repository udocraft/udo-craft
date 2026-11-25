import type { Metadata, Viewport } from "next";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { ClarityInit } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BootSplash } from "@udo-craft/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: "U:DO Craft — Адмін панель",
  description: "B2B мерч-автоматизація. Панель управління.",
};

// Pinch-zoom stays enabled; the layout fits the notch area on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={cn()}>
      <body className="min-h-dvh bg-background">
        <BootSplash />
        <ClarityInit clarityId="w6t8md9b3l" />
        {children}
        <Toaster theme="light" toastOptions={{ style: { background: "var(--color-popover)", border: "1px solid var(--color-border)", color: "var(--color-popover-foreground)" } }} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

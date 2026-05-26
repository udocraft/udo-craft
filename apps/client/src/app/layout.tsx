import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { PageTracker } from "@/components/PageTracker";
import { Toaster } from "@/components/ui/sonner";
import { ClarityInit } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
import { SoundProvider } from "@/app/_components/SoundProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://u-do-craft.store"),
  title: "U:DO CRAFT — Корпоративний мерч, який носять",
  description: "B2B мерч-автоматизація. Ми створюємо одяг, який стає частиною вашої корпоративної ДНК.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "U:DO CRAFT — Корпоративний мерч, який носять",
    description: "B2B мерч-автоматизація. Ми створюємо одяг, який стає частиною вашої корпоративної ДНК.",
    url: "https://u-do-craft.store",
    siteName: "U:DO CRAFT",
    locale: "uk_UA",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "U:DO CRAFT",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "U:DO CRAFT — Корпоративний мерч, який носять",
    description: "B2B мерч-автоматизація. Ми створюємо одяг, який стає частиною вашої корпоративної ДНК.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "U:DO CRAFT",
    url: "https://u-do-craft.store",
    logo: "https://u-do-craft.store/logo.png",
  };

  return (
    <html lang="uk" className={cn()}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClarityInit clarityId="w7kk9avzfh" />
        <PageTracker />
        <SoundProvider />
        {children}
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  );
}

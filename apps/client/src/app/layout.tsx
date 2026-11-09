import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted Geist (Plan.md D5). next/font preloads the files and generates a
// size-adjusted fallback, so swapping causes no layout shift.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://u-do-craft.store"),
  title: "U:DO CRAFT — Corporate merch",
  description: "B2B merch platform. We create clothing that becomes part of your corporate DNA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

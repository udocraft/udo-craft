import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { PageTracker } from "@/components/PageTracker";
import { Toaster } from "@/components/ui/sonner";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentScripts } from "@/components/consent/ConsentScripts";
import { SoundProvider } from "@/app/_components/SoundProvider";
import { locales } from "@/i18n/routing";
import { BASE_CLIENT_NAMESPACES, pickMessages } from "@/i18n/client-messages";
import "../globals.css";

// Self-hosted Geist (Plan.md D5). next/font preloads the files and generates a
// size-adjusted fallback, so swapping causes no layout shift.
const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
  preload: false,
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || "en";
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL("https://u-do-craft.store"),
    title,
    description,
    openGraph: {
      title,
      description,
      url: "https://u-do-craft.store",
      siteName: "U:DO CRAFT",
      locale,
      type: "website",
      images: [{ url: "/logo.png", alt: "U:DO CRAFT" }],
    },
    twitter: { card: "summary", title, description, images: ["/logo.png"] },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || "en";

  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Required for static/ISR rendering with next-intl; without it every page
  // reads the locale from request headers and renders dynamically (no-store).
  setRequestLocale(locale);
  const messages = pickMessages(await getMessages({ locale }), BASE_CLIENT_NAMESPACES);
  const tNav = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased" suppressHydrationWarning>
        <a href="#main" className="skip-link">
          {tNav("skipToContent")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PageTracker />
          <SoundProvider />
          {children}
          <Toaster richColors position="top-right" />
          <ConsentScripts />
          <ConsentBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

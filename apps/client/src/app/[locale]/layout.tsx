import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { PageTracker } from "@/components/PageTracker";
import { Toaster } from "@/components/ui/sonner";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { HtmlLang } from "@/components/HtmlLang";
import { ConsentScripts } from "@/components/consent/ConsentScripts";
import { SoundProvider } from "@/app/_components/SoundProvider";
import { locales } from "@/i18n/routing";

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

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <PageTracker />
      <SoundProvider />
      {children}
      <Toaster richColors position="top-right" />
      <HtmlLang />
      <ConsentScripts />
      <ConsentBanner />
    </NextIntlClientProvider>
  );
}

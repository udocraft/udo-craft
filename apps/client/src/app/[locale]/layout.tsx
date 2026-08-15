import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { PageTracker } from "@/components/PageTracker";
import { Toaster } from "@/components/ui/sonner";
import { ClarityInit } from "@/components/clarity";
import { Analytics } from "@vercel/analytics/next";
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
  return {
    metadataBase: new URL("https://u-do-craft.store"),
    title: "U:DO CRAFT — Corporate merch",
    description: "B2B merch platform. We create clothing that becomes part of your corporate DNA.",
    alternates: { canonical: "/" },
    openGraph: {
      title: "U:DO CRAFT",
      url: "https://u-do-craft.store",
      siteName: "U:DO CRAFT",
      locale: locale,
      type: "website",
    },
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
      <ClarityInit clarityId="w7kk9avzfh" />
      <PageTracker />
      <SoundProvider />
      {children}
      <Toaster richColors position="top-right" />
      <Analytics />
    </NextIntlClientProvider>
  );
}

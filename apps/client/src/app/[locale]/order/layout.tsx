import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { BASE_CLIENT_NAMESPACES, CABINET_NAMESPACES, pickMessages } from "@/i18n/client-messages";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, tMeta] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  return pageMetadata({ locale, path: "/order", title: `${tNav("designMerch")} — U:DO CRAFT`, description: tMeta("description") });
}

/** The order page is a client component, so locale + messages are set up here. OrderReview reads the `cabinet` namespace. */
export default async function OrderLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = pickMessages(await getMessages({ locale }), [...BASE_CLIENT_NAMESPACES, ...CABINET_NAMESPACES]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { BASE_CLIENT_NAMESPACES, CABINET_NAMESPACES, pickMessages } from "@/i18n/client-messages";

export const metadata: Metadata = { robots: { index: true, follow: true } };

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

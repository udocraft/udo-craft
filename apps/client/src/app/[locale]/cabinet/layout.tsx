import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { BASE_CLIENT_NAMESPACES, CABINET_NAMESPACES, pickMessages } from "@/i18n/client-messages";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function CabinetLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = pickMessages(await getMessages({ locale }), [...BASE_CLIENT_NAMESPACES, ...CABINET_NAMESPACES]);
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

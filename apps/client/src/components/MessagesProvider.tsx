"use client";

import { NextIntlClientProvider } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getPageNamespaces, filterMessages } from "@/i18n/page-messages";

export function MessagesProvider({
  messages,
  children,
}: {
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const namespaces = getPageNamespaces(pathname);
  const filtered = filterMessages(messages, namespaces);
  return (
    <NextIntlClientProvider messages={filtered}>
      {children}
    </NextIntlClientProvider>
  );
}

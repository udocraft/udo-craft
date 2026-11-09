import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { defaultLocale, locales } from "@/i18n/routing";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CheckoutRedirect({ params }: { params: { locale: string } }) {
  const locale = locales.find((supportedLocale) => supportedLocale === params.locale);
  if (!locale) redirect("/order");

  redirect(locale === defaultLocale ? "/order" : `/${locale}/order`);
}

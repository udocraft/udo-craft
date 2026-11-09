import type { Metadata } from "next";
import { defaultLocale, locales } from "@/i18n/routing";

export const SITE_URL = "https://u-do-craft.store";

const prefixFor = (locale: string) => (locale === defaultLocale ? "" : `/${locale}`);

/** Canonical URL plus hreflang alternates for one page across all locales. */
export function pageAlternates(locale: string, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `${SITE_URL}${prefixFor(locale)}${path}`,
    languages: Object.fromEntries(
      locales.map((l) => [l, `${SITE_URL}${prefixFor(l)}${path}`]),
    ),
  };
}

/** Serialise JSON-LD for a <script type="application/ld+json"> body. Escapes "<" so "</script>" in data cannot break out. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

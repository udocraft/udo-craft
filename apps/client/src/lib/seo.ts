import type { Metadata } from "next";
import { defaultLocale, locales } from "@/i18n/routing";

export const SITE_URL = "https://u-do-craft.store";

const prefixFor = (locale: string) => (locale === defaultLocale ? "" : `/${locale}`);

/** Absolute URL of a public page in one locale. English has no prefix ("as-needed"). */
export function localizedUrl(locale: string, path: string): string {
  return `${SITE_URL}${prefixFor(locale)}${path === "/" ? "" : path}` || SITE_URL;
}

/** hreflang map for one page: every locale plus `x-default` pointing at English. */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, localizedUrl(l, path)])),
    "x-default": localizedUrl(defaultLocale, path),
  };
}

/** Canonical URL plus hreflang alternates for one page across all locales. */
export function pageAlternates(locale: string, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizedUrl(locale, path),
    languages: languageAlternates(path),
  };
}

const OG_LOCALES: Record<string, string> = {
  en: "en_US", uk: "uk_UA", de: "de_DE", fr: "fr_FR", es: "es_ES", it: "it_IT",
  pl: "pl_PL", nl: "nl_NL", pt: "pt_PT", cs: "cs_CZ", sv: "sv_SE",
};

/** Open Graph locale code (`en_US`) for a route locale (`en`). */
export function ogLocale(locale: string): string {
  return OG_LOCALES[locale] ?? "en_US";
}

/** Serialise JSON-LD for a <script type="application/ld+json"> body. Escapes "<" so "</script>" in data cannot break out. */
export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

interface PageMetaInput {
  locale: string;
  /** Path without locale prefix, e.g. "/privacy" or "" for home. */
  path: string;
  title: string;
  description?: string;
  /** Overrides the generated share card (e.g. a product photo). Absolute URL. */
  image?: string;
  /** Keep the page out of search results. */
  noindex?: boolean;
}

/**
 * Title, description, canonical + hreflang (with x-default), Open Graph and Twitter
 * card for one public page. Without `image`, the locale's generated share card is used.
 */
export function pageMetadata({ locale, path, title, description, image, noindex }: PageMetaInput): Metadata {
  const alternates = pageAlternates(locale, path);
  // Pages that set their own openGraph do not inherit the file-convention image,
  // so always name one: the product photo, else the locale's generated card.
  const images = image
    ? [{ url: image, alt: title }]
    : [{ url: localizedUrl(locale, "/opengraph-image"), width: 1200, height: 630, alt: "U:DO CRAFT" }];
  return {
    title,
    ...(description ? { description } : {}),
    alternates,
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      ...(description ? { description } : {}),
      url: alternates.canonical as string,
      siteName: "U:DO CRAFT",
      locale: ogLocale(locale),
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description ? { description } : {}),
      images: images.map((i) => i.url),
    },
  };
}

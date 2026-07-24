import { defineRouting } from "next-intl/routing";

export const locales = ["en", "de", "fr", "es", "it", "pl", "nl", "pt", "cs", "sv"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed", // English = /, German = /de, etc.
});

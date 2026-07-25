"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";

const LABELS: Record<Locale, string> = {
  en: "EN", de: "DE", fr: "FR", es: "ES",
  it: "IT", pl: "PL", nl: "NL", pt: "PT",
  cs: "CS", sv: "SV",
};

const NAMES: Record<Locale, string> = {
  en: "English", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", pl: "Polski", nl: "Nederlands", pt: "Português",
  cs: "Čeština", sv: "Svenska",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as Locale;
    router.replace(pathname, { locale: next });
  };

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label="Language"
      className="bg-transparent text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5"
    >
      {locales.map((l) => (
        <option key={l} value={l} title={NAMES[l]}>
          {LABELS[l]}
        </option>
      ))}
    </select>
  );
}

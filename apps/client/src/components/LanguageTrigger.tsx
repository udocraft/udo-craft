import { ChevronDown } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export const FLAGS: Record<Locale, string> = {
  en: "🇬🇧", uk: "🇺🇦", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸",
  it: "🇮🇹", pl: "🇵🇱", nl: "🇳🇱", pt: "🇵🇹",
  cs: "🇨🇿", sv: "🇸🇪",
};

export const TRIGGER_CLASS =
  "flex min-h-11 min-w-11 items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5 bg-transparent";

/** Flag + locale code + chevron. Shared by the static trigger and the base-ui menu trigger. */
export function TriggerBody({ locale }: { locale: Locale }) {
  return (
    <>
      <span className="text-sm">{FLAGS[locale] || "🌐"}</span>
      <span>{(locale || "EN").toUpperCase()}</span>
      <ChevronDown className="w-3 h-3" />
    </>
  );
}

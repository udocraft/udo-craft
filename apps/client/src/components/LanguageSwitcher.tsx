"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Check, Globe, ChevronDown } from "lucide-react";

const FLAGS: Record<Locale, string> = {
  en: "🇬🇧", uk: "🇺🇦", de: "🇩🇪", fr: "🇫🇷", es: "🇪🇸",
  it: "🇮🇹", pl: "🇵🇱", nl: "🇳🇱", pt: "🇵🇹",
  cs: "🇨🇿", sv: "🇸🇪",
};

const NAMES: Record<Locale, string> = {
  en: "English", uk: "Українська", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", pl: "Polski", nl: "Nederlands", pt: "Português",
  cs: "Čeština", sv: "Svenska",
};

export function LanguageSwitcher() {
  const rawLocale = useLocale();
  const locale = (rawLocale && locales.includes(rawLocale as any) ? rawLocale : "en") as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredLocales = locales.filter((l) =>
    (NAMES[l] || l).toLowerCase().includes(search.toLowerCase()) ||
    l.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (next: Locale) => {
    router.replace(pathname, { locale: next });
    setOpen(false);
    setSearch("");
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Language"
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5 bg-transparent"
      >
        <span className="text-sm">{FLAGS[locale] || "🌐"}</span>
        <span>{(locale || "EN").toUpperCase()}</span>
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-2">
        <div className="mb-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filteredLocales.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-2">
              No languages found
            </div>
          ) : (
            filteredLocales.map((l) => (
              <DropdownMenuItem
                key={l}
                onClick={() => handleSelect(l)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{FLAGS[l]}</span>
                  <span className="text-sm">{NAMES[l]}</span>
                </div>
                {locale === l && <Check className="w-4 h-4 text-primary" />}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

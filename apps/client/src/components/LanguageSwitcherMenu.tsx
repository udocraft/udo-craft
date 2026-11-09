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
import { Check } from "lucide-react";
import { FLAGS, TRIGGER_CLASS, TriggerBody } from "./LanguageTrigger";

const NAMES: Record<Locale, string> = {
  en: "English", uk: "Українська", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", pl: "Polski", nl: "Nederlands", pt: "Português",
  cs: "Čeština", sv: "Svenska",
};

export function LanguageSwitcherMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const rawLocale = useLocale();
  const locale = (rawLocale && locales.includes(rawLocale as any) ? rawLocale : "en") as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
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
      <DropdownMenuTrigger aria-label="Language" className={TRIGGER_CLASS}>
        <TriggerBody locale={locale} />
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

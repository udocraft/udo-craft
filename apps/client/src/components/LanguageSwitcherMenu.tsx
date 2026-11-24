"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, type Locale } from "@/i18n/routing";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { FLAGS, TRIGGER_CLASS, TriggerBody } from "./LanguageTrigger";

const NAMES: Record<Locale, string> = {
  en: "English", uk: "Українська", de: "Deutsch", fr: "Français", es: "Español",
  it: "Italiano", pl: "Polski", nl: "Nederlands", pt: "Português",
  cs: "Čeština", sv: "Svenska",
};

/** Plain substring match on code and native name (cmdk's default fuzzy match finds "Español" for "pol"). */
const substringFilter = (value: string, search: string, keywords?: string[]) => {
  const q = search.trim().toLowerCase();
  return [value, ...(keywords ?? [])].some((v) => v.toLowerCase().includes(q)) ? 1 : 0;
};

export function LanguageSwitcherMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const rawLocale = useLocale();
  const locale = (rawLocale && (locales as readonly string[]).includes(rawLocale) ? rawLocale : "en") as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(defaultOpen);
  // cmdk always keeps a row "selected" for Enter (the first one on open). Only paint
  // that cursor once the visitor uses the keyboard; the mouse paints the hovered row.
  const [usingKeys, setUsingKeys] = useState(false);
  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setUsingKeys(false);
  };

  const handleSelect = (next: Locale) => {
    onOpenChange(false);
    if (next !== locale) router.replace(pathname, { locale: next });
  };

  // Popover + Command, not a dropdown menu: a menu moves focus onto items on hover
  // and handles letter/Space keys itself, which fights a search field inside it.
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger aria-label="Language" className={TRIGGER_CLASS}>
        <TriggerBody locale={locale} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 gap-0 p-1">
        <Command
          loop
          filter={substringFilter}
          onKeyDown={() => setUsingKeys(true)}
          className={usingKeys ? undefined : "[&_[data-slot=command-item][data-selected=true]:not(:hover)]:bg-transparent"}
        >
          <CommandInput placeholder="Search..." autoFocus />
          <CommandList className="max-h-64">
            <CommandEmpty>No languages found</CommandEmpty>
            {locales.map((l) => (
              <CommandItem
                key={l}
                value={l}
                keywords={[NAMES[l]]}
                onSelect={() => handleSelect(l)}
                data-checked={locale === l}
                className="cursor-pointer *:[svg]:text-primary"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">{FLAGS[l]}</span>
                  <span className="text-sm">{NAMES[l]}</span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

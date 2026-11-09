"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { locales, type Locale } from "@/i18n/routing";
import { TRIGGER_CLASS, TriggerBody } from "./LanguageTrigger";

const loadMenu = () => import("./LanguageSwitcherMenu").then((m) => m.LanguageSwitcherMenu);

/**
 * The language menu (base-ui dropdown + floating-ui, ~35 kB gzip) is loaded on
 * the first hover, focus or tap of this static trigger, not with the page. The
 * real menu replaces the button and opens immediately.
 */
const Menu = dynamic(loadMenu, { ssr: false, loading: () => <LanguageSwitcherStatic /> });

function LanguageSwitcherStatic({ onActivate }: { onActivate?: () => void }) {
  const rawLocale = useLocale();
  const locale = (rawLocale && locales.includes(rawLocale as Locale) ? rawLocale : "en") as Locale;
  return (
    <button
      type="button"
      aria-label="Language"
      aria-haspopup="menu"
      aria-expanded={false}
      className={TRIGGER_CLASS}
      onPointerEnter={() => void loadMenu()}
      onFocus={() => void loadMenu()}
      onClick={onActivate}
    >
      <TriggerBody locale={locale} />
    </button>
  );
}

export function LanguageSwitcher() {
  const [activated, setActivated] = useState(false);
  return activated ? <Menu defaultOpen /> : <LanguageSwitcherStatic onActivate={() => setActivated(true)} />;
}

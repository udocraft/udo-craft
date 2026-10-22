"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Sets <html lang> to the active locale. The root layout cannot know the locale,
 * so this runs after hydration. Moving <html> into the locale layout would also
 * set it on the server (follow-up).
 */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

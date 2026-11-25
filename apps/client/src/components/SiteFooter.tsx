"use client";

import { useTranslations } from "next-intl";
import { FooterSection } from "@/app/_sections/FooterSection";

/** Footer for content pages. Same design as the home footer, default copy and links. */
export function SiteFooter() {
  const t = useTranslations("footer");
  return (
    <FooterSection
      tagline={t("tagline")}
      copyright={t("copyright")}
      instagram="https://www.instagram.com/u.do.craft/"
      telegram="https://t.me/udostore"
    />
  );
}

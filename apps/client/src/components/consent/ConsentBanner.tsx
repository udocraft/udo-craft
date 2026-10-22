"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useConsent, writeConsent } from "@/lib/consent";

export function ConsentBanner() {
  const t = useTranslations("consent");
  const consent = useConsent();

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label={t("title")}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-4 rounded-lg border bg-background p-4 shadow-lg md:flex-row md:items-center"
    >
      <p className="text-sm text-muted-foreground">
        {t("message")}{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          {t("privacy")}
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" onClick={() => writeConsent("denied")}>
          {t("decline")}
        </Button>
        <Button size="sm" onClick={() => writeConsent("granted")}>
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}

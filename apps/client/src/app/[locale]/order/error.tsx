"use client";

import { useTranslations } from "next-intl";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@udo-craft/ui";

export default function OrderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("editor");
  useEffect(() => {
    console.error("Order page error:", error);
    if (error.digest) console.error("Error digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">{t("errorPage.title")}</h2>
        <p className="text-muted-foreground">
          {t("errorPage.text")}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            {t("common.retry")}
          </Button>
          <Link
            href="/"
            className="inline-flex items-center border border-border hover:bg-accent text-foreground font-medium text-sm px-6 py-3 rounded-full transition-all"
          >
            {t("common.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

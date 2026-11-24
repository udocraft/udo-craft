"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@udo-craft/ui";
import { useTranslations } from "next-intl";

export default function CabinetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("cabinet.errorPage");
  useEffect(() => {
    console.error("Cabinet page error:", error);
    if (error.digest) console.error("Error digest:", error.digest);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">
          {t("text")}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            {t("retry")}
          </Button>
          <Link
            href="/"
            className="inline-flex items-center border border-border hover:bg-accent text-foreground font-medium text-sm px-6 py-3 rounded-full transition-all"
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

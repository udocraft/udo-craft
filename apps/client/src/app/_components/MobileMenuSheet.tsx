"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@udo-craft/ui";
import { BrandLogoFull } from "@/components/brand-logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: { href: string; label: string }[];
}

export function MobileMenuSheet({ open, onOpenChange, links }: MobileMenuSheetProps) {
  const t = useTranslations("nav");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border p-0 sm:max-w-sm">
        <div className="flex h-16 items-center border-b border-border px-6">
          <BrandLogoFull className="h-7 w-auto" color="var(--color-primary)" />
        </div>
        <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
        <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>
        <nav className="flex flex-1 flex-col gap-1 p-4" aria-label={t("mainNav")}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => onOpenChange(false)}
              className="flex min-h-12 items-center rounded-xl px-4 text-base font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild variant="primary" size="lg" className="mt-3">
            <Link href="/order" onClick={() => onOpenChange(false)}>
                {t("designMerch")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/#contact" onClick={() => onOpenChange(false)}>
                {t("getQuote")}
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

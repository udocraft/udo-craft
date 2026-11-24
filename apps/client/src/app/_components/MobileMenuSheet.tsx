"use client";

import { Link } from "@/i18n/navigation";
import { Instagram, Mail, Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { BrandLogoFull } from "@/components/brand-logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { telHref, type SiteContacts } from "@/lib/contacts";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: { href: string; label: string }[];
  contacts: SiteContacts;
}

const row =
  "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MobileMenuSheet({ open, onOpenChange, links, contacts }: MobileMenuSheetProps) {
  const t = useTranslations("nav");
  const close = () => onOpenChange(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border p-0 sm:max-w-sm">
        <div className="flex h-14 items-center border-b border-border px-6">
          <BrandLogoFull className="h-7 w-auto" color="var(--color-primary)" />
        </div>
        <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
        <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>

        <nav className="flex flex-col gap-1 p-4" aria-label={t("mainNav")}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={close} className={`${row} font-medium`}>
              {link.label}
            </Link>
          ))}
          <Link href="/order" prefetch={false} onClick={close} className={buttonVariants({ variant: "primary", size: "lg", className: "mt-3" })}>
            {t("createDesign")}
          </Link>
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-border p-4 text-muted-foreground">
          <a href={telHref(contacts.phone)} className={row}>
            <Phone className="size-5 shrink-0" aria-hidden="true" /> {contacts.phone}
          </a>
          <a href={`mailto:${contacts.email}`} className={row}>
            <Mail className="size-5 shrink-0" aria-hidden="true" /> {contacts.email}
          </a>
          <div className="flex gap-1 px-1">
            <a href={contacts.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex size-12 items-center justify-center rounded-xl hover:bg-muted">
              <Instagram className="size-5" aria-hidden="true" />
            </a>
            <a href={contacts.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="flex size-12 items-center justify-center rounded-xl hover:bg-muted">
              <Send className="size-5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

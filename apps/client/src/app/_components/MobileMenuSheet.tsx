"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Globe, Mail, MapPin, Phone, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { socialLinks } from "@/components/social-links";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { MAPS_DIRECTIONS_URL, telHref, type SiteContacts } from "@/lib/contacts";

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: { href: string; label: string; Icon: LucideIcon }[];
  contacts: SiteContacts;
}

const row =
  "flex min-h-12 items-center gap-3 rounded-xl px-4 text-base text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
/** Icons are plain, in the brand colour. */
const icon = "size-5 shrink-0 text-primary";
const sectionLabel = "px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground";

export function MobileMenuSheet({ open, onOpenChange, links, contacts }: MobileMenuSheetProps) {
  const t = useTranslations("nav");
  const tHome = useTranslations("homeContact");
  const close = () => onOpenChange(false);
  const [askMaps, setAskMaps] = useState(false);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 border-l border-border p-0 sm:max-w-sm">
        {/* Header: title left, close right, both on the same centre line */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-6 pr-2">
          <SheetTitle className="text-base font-semibold">{t("menu")}</SheetTitle>
          <SheetClose
            aria-label={t("closeMenu")}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" aria-hidden="true" />
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex flex-col gap-1 p-4" aria-label={t("mainNav")}>
            {links.map(({ href, label, Icon }) => (
              <Link key={href} href={href} onClick={close} className={`${row} font-medium`}>
                <Icon className={icon} strokeWidth={2} aria-hidden="true" />
                {label}
              </Link>
            ))}
            <Link href="/order" prefetch={false} onClick={close} className={buttonVariants({ variant: "primary", size: "lg", className: "mt-3" })}>
              {t("createDesign")}
            </Link>
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-border p-4">
            <p className={sectionLabel}>{t("contacts")}</p>
            <a href={telHref(contacts.phone)} className={row}>
              <Phone className={icon} strokeWidth={2} aria-hidden="true" />
              {contacts.phone}
            </a>
            <a href={`mailto:${contacts.email}`} className={row}>
              <Mail className={icon} strokeWidth={2} aria-hidden="true" />
              {contacts.email}
            </a>
            {/* Tapping the address asks first; Maps opens only on "Open Maps". */}
            <button
              type="button"
              onClick={() => setAskMaps((v) => !v)}
              aria-expanded={askMaps}
              className={`${row} w-full text-left`}
            >
              <MapPin className={`${icon} mt-2.5 self-start`} strokeWidth={2} aria-hidden="true" />
              <span className="flex flex-col py-2">
                <span>{tHome("address")}</span>
                <span className="text-sm text-muted-foreground">({tHome("visitNote")})</span>
              </span>
            </button>
            {askMaps && (
              <div role="group" aria-label={t("directionsPrompt")} className="animate-enter-down mx-1 mb-1 flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="pt-1.5 text-sm text-foreground">{t("directionsPrompt")}</p>
                  <button
                    type="button"
                    onClick={() => setAskMaps(false)}
                    aria-label={t("directionsCancel")}
                    className="-mr-1.5 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <a
                  href={MAPS_DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAskMaps(false)}
                  className={buttonVariants({ variant: "primary", size: "sm", className: "w-full" })}
                >
                  {t("directionsOpen")}
                </a>
              </div>
            )}

            <div className="mt-1 grid grid-cols-2 gap-x-1 gap-y-1">
              {socialLinks(contacts).map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`${row} min-w-0 px-3 text-sm`}>
                  <Icon className={icon} />
                  {label}
                </a>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-4 pt-3">
              <span className="flex items-center gap-3 text-base text-foreground">
                <Globe className={icon} strokeWidth={2} aria-hidden="true" />
                {t("language")}
              </span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Link } from "@/i18n/navigation";
import { Instagram, Send, ArrowRight } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { useTranslations } from "next-intl";
import { resetConsent } from "@/lib/consent";
import { Button } from "@udo-craft/ui";

interface FooterSectionProps {
  tagline: string; copyright: string; instagram: string; telegram: string;
  /** The "ready to start" strip. The home page hides it: its contact section already ends in the same CTA. */
  showCta?: boolean;
}

export function FooterSection({ tagline, copyright, instagram, telegram, showCta = true }: FooterSectionProps) {
  const t = useTranslations("footer");
  const tc = useTranslations("consent");

  const NAV = [
    {
      title: t("columns.products.title"),
      links: [
        { href: "/order",    label: t("columns.products.links.constructor") },
        { href: "/#catalog",  label: t("columns.products.links.catalog") },
        { href: "/#contact",  label: t("columns.products.links.box") },
        { href: "/#contact",  label: t("columns.products.links.designer") },
      ],
    },
    {
      title: t("columns.company.title"),
      links: [
        { href: "/#about",   label: t("columns.company.links.about") },
        { href: "/#how",     label: t("columns.company.links.how") },
        { href: "/#contact", label: t("columns.company.links.career") },
        { href: "/#contact", label: t("columns.company.links.blog") },
      ],
    },
    {
      title: t("columns.support.title"),
      links: [
        { href: "/#faq",     label: t("columns.support.links.faq") },
        { href: "/#contact", label: t("columns.support.links.contact") },
        { href: "/cabinet", label: t("columns.support.links.cabinet") },
        { href: "/#contact", label: t("columns.support.links.delivery") },
      ],
    },
  ];
  return (
    <footer className="inverse bg-background text-foreground" aria-label={t("ariaLabel")}>
      {/* Pre-footer CTA strip */}
      {showCta && (
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-gutter py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="text-foreground font-bold text-base mb-1">{t("readyToStart")}</p>
            <p className="text-muted-foreground text-sm">{t("readyDesc")}</p>
          </div>
          <Button asChild variant="primary" className="shrink-0">
            <Link href="/order">
              {t("startProject")} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      )}

      {/* Main footer */}
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-gutter pt-14 pb-10">
          <div className="grid grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 md:gap-8">

            {/* Brand */}
            <div className="col-span-2 md:col-span-1 flex flex-col gap-5">
              <Link href="/" aria-label={t("homeLink")} className="inline-flex min-h-11 items-center">
                <BrandLogoFull className="h-10 w-auto" color="currentColor" />
              </Link>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-52">{tagline}</p>
              <div className="flex gap-2">
                {[
                  { href: instagram, icon: Instagram, label: "Instagram" },
                  { href: telegram, icon: Send, label: "Telegram" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      aria-label={s.label}
                      className="hit-44 w-8 h-8 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 hover:border-input transition-all duration-200">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Nav columns */}
            {NAV.map((col) => (
              <div key={col.title} className="flex flex-col gap-4">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide">{col.title}</p>
                <nav className="flex flex-col gap-2.5" aria-label={col.title}>
                  {col.links.map((l) => (
                    <Link key={l.label} href={l.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 w-fit py-3.5">
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-gutter py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {copyright}</p>
          <div className="flex gap-5">
            {[
              { href: "/privacy", label: tc("privacy") },
              { href: "/terms", label: tc("terms") },
            ].map((l) => (
              <Link key={l.label} href={l.href}
                className="inline-block py-3.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={resetConsent}
              className="inline-block py-3.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
              {tc("cookieSettings")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

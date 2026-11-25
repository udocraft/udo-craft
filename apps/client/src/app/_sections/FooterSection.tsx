"use client";

import { useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Instagram, Send, ArrowRight, Check, Loader2 } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { useLocale, useTranslations } from "next-intl";
import { resetConsent } from "@/lib/consent";

interface FooterSectionProps {
  tagline: string;
  copyright: string;
  instagram: string;
  telegram: string;
  /** First-order discount promised for newsletter sign-ups. */
  discountPct?: number;
}

type FormState = "idle" | "loading" | "done" | "error" | "invalid";

function NewsletterForm({ pct }: { pct: number }) {
  const t = useTranslations("footer.newsletter");
  const locale = useLocale();
  const inputId = useId();
  const msgId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const honeypot = (new FormData(e.currentTarget).get("website") as string) || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setState("invalid"); return; }
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, website: honeypot }),
      });
      setState(res.ok ? "done" : res.status === 400 ? "invalid" : "error");
    } catch {
      setState("error");
    }
  };

  const message =
    state === "done" ? t("success", { pct }) :
    state === "error" ? t("error") :
    state === "invalid" ? t("invalid") : t("consent");

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-md">
      <label htmlFor={inputId} className="sr-only">{t("label")}</label>
      {/* Honeypot: hidden from people and assistive tech */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex items-center gap-3">
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state !== "loading") setState("idle"); }}
          placeholder={t("placeholder")}
          aria-describedby={msgId}
          aria-invalid={state === "invalid"}
          disabled={state === "done"}
          className="h-14 min-w-0 flex-1 rounded-full bg-white/10 px-6 text-base text-white placeholder:text-white/45 outline-none transition-colors focus:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "done"}
          aria-label={t("submit")}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-surface-dark transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:hover:scale-100"
        >
          {state === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            : state === "done" ? <Check className="size-5" aria-hidden="true" />
            : <ArrowRight className="size-5" aria-hidden="true" />}
        </button>
      </div>
      <p
        id={msgId}
        role={state === "error" || state === "invalid" ? "alert" : "status"}
        className={`mt-3 pl-6 text-sm ${state === "error" || state === "invalid" ? "text-red-300" : state === "done" ? "text-emerald-300" : "text-white/45"}`}
      >
        {message}
      </p>
    </form>
  );
}

export function FooterSection({ tagline, copyright, instagram, telegram, discountPct = 10 }: FooterSectionProps) {
  const t = useTranslations("footer");
  const tn = useTranslations("footer.newsletter");
  const tc = useTranslations("consent");

  const NAV = [
    {
      title: t("columns.products.title"),
      links: [
        { href: "/order", label: t("columns.products.links.constructor") },
        { href: "/#catalog", label: t("columns.products.links.catalog") },
        { href: "/popup", label: t("columns.products.links.popup") },
        { href: "/#contact", label: t("columns.products.links.box") },
        { href: "/#contact", label: t("columns.products.links.designer") },
      ],
    },
    {
      title: t("columns.company.title"),
      links: [
        { href: "/#about", label: t("columns.company.links.about") },
        { href: "/#how", label: t("columns.company.links.how") },
        { href: "/#contact", label: t("columns.company.links.career") },
        { href: "/#contact", label: t("columns.company.links.blog") },
      ],
    },
    {
      title: t("columns.support.title"),
      links: [
        { href: "/#faq", label: t("columns.support.links.faq") },
        { href: "/#contact", label: t("columns.support.links.contact") },
        { href: "/cabinet", label: t("columns.support.links.cabinet") },
        { href: "/#contact", label: t("columns.support.links.delivery") },
      ],
    },
  ];

  const socials = [
    { href: instagram, icon: Instagram, label: "Instagram" },
    { href: telegram, icon: Send, label: "Telegram" },
  ];

  return (
    <footer className="bg-surface-dark text-white overflow-hidden" aria-label={t("ariaLabel")}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-20 sm:pt-28">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* Offer + newsletter */}
          <div className="flex flex-col gap-8">
            <h2 className="max-w-[14ch] text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl">
              {tn("title", { pct: discountPct })}
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-white/55">{tn("desc")}</p>
            <NewsletterForm pct={discountPct} />
            <div className="mt-auto flex gap-3 pt-4">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-14 place-items-center rounded-full bg-white/8 text-white/80 transition-colors duration-200 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <Icon className="size-5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3">
            {NAV.map((col) => (
              <nav key={col.title} aria-label={col.title} className="flex flex-col">
                <p className="mb-4 text-sm text-white/40">{col.title}</p>
                <ul className="flex flex-col">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-11 items-center text-base text-white/85 transition-colors duration-200 hover:text-white focus-visible:outline-none focus-visible:underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 flex flex-col gap-3 border-t border-white/10 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/45">
            © {new Date().getFullYear()} {copyright} <span className="hidden md:inline">· {tagline}</span>
          </p>
          <div className="flex flex-wrap gap-x-6">
            {[
              { href: "/privacy", label: tc("privacy") },
              { href: "/terms", label: tc("terms") },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="inline-flex min-h-11 items-center text-sm text-white/55 transition-colors hover:text-white">
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={resetConsent} className="inline-flex min-h-11 items-center text-sm text-white/55 transition-colors hover:text-white">
              {tc("cookieSettings")}
            </button>
          </div>
        </div>
      </div>

      {/* Closing wordmark — the footer ends on the brand, edge to edge */}
      <Link
        href="/"
        aria-label={t("homeLink")}
        className="block px-4 sm:px-6 lg:px-10 pb-6 sm:pb-10 focus-visible:outline-none focus-visible:opacity-80"
      >
        <BrandLogoFull className="block h-auto w-full" color="white" />
      </Link>
    </footer>
  );
}

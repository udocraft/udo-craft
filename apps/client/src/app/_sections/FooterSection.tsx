"use client";

import { useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Instagram, Send, ArrowRight, Check, Loader2 } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { useLocale, useTranslations } from "next-intl";
import { resetConsent } from "@/lib/consent";
import { Button } from "@udo-craft/ui";
import { motion } from "framer-motion";

interface FooterSectionProps {
  tagline: string; copyright: string; instagram: string; telegram: string;
  /** The "ready to start" strip. The home page hides it: its contact section already ends in the same CTA. */
  showCta?: boolean;
  /** First-order discount promised for newsletter sign-ups. */
  discountPct?: number;
}

type FormState = "idle" | "loading" | "done" | "error" | "invalid";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    if (!EMAIL_RE.test(email.trim())) { setState("invalid"); return; }
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

  const failed = state === "error" || state === "invalid";
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
          className="h-14 min-w-0 flex-1 rounded-lg bg-foreground/10 px-6 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-foreground/15 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "done"}
          aria-label={t("submit")}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-fast hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:hover:scale-100"
        >
          {state === "loading" ? <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            : state === "done" ? <Check className="size-5" aria-hidden="true" />
            : <ArrowRight className="size-5" aria-hidden="true" />}
        </button>
      </div>
      <p id={msgId} role={failed ? "alert" : "status"} className={`mt-3 pl-6 text-sm ${failed ? "text-destructive" : state === "done" ? "text-success" : "text-muted-foreground"}`}>
        {message}
      </p>
    </form>
  );
}

export function FooterSection({ tagline, copyright, instagram, telegram, showCta = true, discountPct = 10 }: FooterSectionProps) {
  const t = useTranslations("footer");
  const tn = useTranslations("footer.newsletter");
  const tc = useTranslations("consent");

  // Only links to pages and anchors that exist. Company offers live under /biz.
  const NAV = [
    {
      title: t("columns.products.title"),
      links: [
        { href: "/order",    label: t("columns.products.links.constructor") },
        { href: "/#catalog", label: t("columns.products.links.catalog") },
        { href: "/#how",     label: t("columns.company.links.how") },
      ],
    },
    {
      title: t("columns.business.title"),
      links: [
        { href: "/biz",          label: t("columns.business.links.overview") },
        { href: "/biz#services", label: t("columns.products.links.box") },
        { href: "/popup",        label: t("columns.products.links.popup") },
        { href: "/biz#about",    label: t("columns.company.links.about") },
      ],
    },
    {
      title: t("columns.support.title"),
      links: [
        { href: "/#faq",        label: t("columns.support.links.faq") },
        { href: "/biz#contact", label: t("columns.support.links.contact") },
        { href: "/cabinet",     label: t("columns.support.links.cabinet") },
      ],
    },
  ];
  const socials = [
    { href: instagram, icon: Instagram, label: "Instagram" },
    { href: telegram, icon: Send, label: "Telegram" },
  ];

  return (
    <footer className="inverse overflow-hidden bg-background text-foreground" aria-label={t("ariaLabel")}>
      {showCta && (
        <div className="border-b border-border">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-6 px-gutter py-10 sm:flex-row sm:items-center">
            <div>
              <p className="text-h4 font-semibold">{t("readyToStart")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("readyDesc")}</p>
            </div>
            <Button asChild variant="primary" className="shrink-0">
              <Link href="/order">
                {t("startProject")} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl px-gutter pt-20 sm:pt-28">
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
          {/* Offer + newsletter */}
          <div className="flex flex-col gap-8">
            <h2 className="max-w-[14ch] text-h1 font-semibold text-balance">{tn("title", { pct: discountPct })}</h2>
            <p className="max-w-md text-lede text-muted-foreground">{tn("desc")}</p>
            <NewsletterForm pct={discountPct} />
            <div className="flex gap-3 pt-4">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-14 place-items-center rounded-full bg-foreground/8 text-foreground/80 transition-colors duration-fast hover:bg-foreground/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <p className="mb-4 text-sm text-muted-foreground">{col.title}</p>
                <ul className="flex flex-col">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="inline-flex min-h-11 items-center text-base text-foreground/85 transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:underline">
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
        <div className="mt-20 flex flex-col gap-3 border-t border-border py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {copyright} <span className="hidden md:inline">· {tagline}</span>
          </p>
          <div className="flex flex-wrap gap-x-6">
            {[
              { href: "/privacy", label: tc("privacy") },
              { href: "/terms", label: tc("terms") },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
            <button type="button" onClick={resetConsent} className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
              {tc("cookieSettings")}
            </button>
          </div>
        </div>

        {/* Closing wordmark: the logo shows its top 95% as a faint watermark that
            spans the content width and grows up from its bottom edge once it scrolls into view. */}
        {/* The observer watches the unscaled link: a box at scale(0) has no area and never "enters" the viewport.
            Reduced motion is handled in CSS (transform-none!), so server and client render the same markup. */}
        <motion.div
          initial="hidden"
          whileInView="shown"
          viewport={{ once: true, amount: 0.5 }}
        >
          <Link href="/" aria-label={t("homeLink")} className="block focus-visible:outline-none focus-visible:opacity-80">
            <motion.div
              aria-hidden="true"
              className="aspect-[780/228] origin-bottom overflow-hidden opacity-15 motion-reduce:transform-none!"
              variants={{ hidden: { scale: 0 }, shown: { scale: 1 } }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <BrandLogoFull className="block h-auto w-full" color="currentColor" />
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </footer>
  );
}

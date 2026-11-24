"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { User, ShoppingBag, Menu, Phone, Mail, Shirt, ListChecks, Briefcase } from "lucide-react";
import { socialLinks } from "@/components/social-links";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { BrandLogoFull } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { sound } from "@/lib/sound";
import { telHref, type SiteContacts } from "@/lib/contacts";

// The sheet pulls in the base-ui dialog; load it on the first tap of the burger.
const MobileMenuSheet = dynamic(() => import("./MobileMenuSheet").then((m) => m.MobileMenuSheet), { ssr: false });

interface NavBarProps {
  isLoggedIn: boolean;
  cartCount: number;
  contacts: SiteContacts;
  onCartOpen: () => void;
  onAuthOpen?: () => void;
}

// Long ease-out: fast start, very soft landing.
const morph = "duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

/** Content inset shared by both rows; the pill's edges sit on the max-w-6xl box. */
const rowInner = "mx-auto flex max-w-6xl items-center px-gutter md:px-8 lg:px-10";

const iconButton =
  "relative flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const topLink =
  "inline-flex min-h-8 items-center gap-1.5 rounded-control text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Two-level header. Top row (md+): phone, email and socials; main row: logo,
 * navigation, account, cart and the primary action. On scroll both rows float as one
 * rounded pill. `--header-height` in globals.css matches the full height. `--header-height` in globals.css matches both heights.
 */
export function NavBar({ isLoggedIn, cartCount, contacts, onCartOpen, onAuthOpen }: NavBarProps) {
  const t = useTranslations("nav");
  const navLinks = [
    { href: "/#catalog", label: t("catalog"), Icon: Shirt },
    { href: "/#how", label: t("how"), Icon: ListChecks },
    { href: "/biz", label: t("business"), Icon: Briefcase },
  ];
  const socials = socialLinks(contacts);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Hysteresis: morph past 24px, unmorph under 4px, so it never flickers at the edge.
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled((prev) => (prev ? y > 4 : y > 24));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`relative transition-transform ${morph} ${scrolled ? "translate-y-2 md:translate-y-3" : "translate-y-0"}`}>
        {/* One surface carries the look: full-width bar at the top, floating pill on scroll.
            Only its edges, radius and shadow animate; the content does not reflow. The
            gray band at the top is the contact row (md+). */}
        <div
          aria-hidden="true"
          className={`absolute inset-y-0 border bg-[linear-gradient(to_bottom,var(--color-muted)_var(--strip),var(--color-card)_var(--strip))] [--strip:0px] md:[--strip:2.25rem] transition-[left,right,border-radius,border-color,box-shadow] ${morph} ${
            scrolled
              ? "left-[max(0.375rem,calc(50%_-_36rem))] right-[max(0.375rem,calc(50%_-_36rem))] rounded-[28px] border-border/80 shadow-[0_12px_40px_rgba(12,16,34,0.12)]"
              : "left-0 right-0 rounded-none border-transparent border-b-border/70 shadow-none"
          }`}
        />

        {/* Top row: contacts and socials, desktop only */}
        <div className="relative hidden h-9 md:block">
        <div className={`${rowInner} h-full justify-between gap-6 text-xs`}>
          <div className="flex items-center gap-5">
            <a href={telHref(contacts.phone)} className={topLink}>
              <Phone className="size-3.5" aria-hidden="true" />
              {contacts.phone}
            </a>
            <a href={`mailto:${contacts.email}`} className={topLink}>
              <Mail className="size-3.5" aria-hidden="true" />
              {contacts.email}
            </a>
          </div>
          <div className="flex items-center gap-5">
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={topLink}>
                <Icon className="size-3.5" aria-hidden="true" />
                {label}
              </a>
            ))}
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <LanguageSwitcher />
          </div>
        </div>
        </div>

        {/* Main row */}
        <nav aria-label={t("mainNav")} className="relative">
        <div className={`${rowInner} relative h-14 gap-2`}>
          <Link
            href="/"
            aria-label={t("logoLink")}
            className="mr-auto inline-flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandLogoFull className="h-7 w-auto" color="var(--color-primary)" />
          </Link>

          <ul className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-control px-4 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-0.5">
            {isLoggedIn ? (
              <Link href="/cabinet" aria-label={t("goToAccount")} className={iconButton}>
                <User className="size-5" strokeWidth={1.8} />
              </Link>
            ) : (
              <button type="button" onClick={() => { sound.tap(); onAuthOpen?.(); }} aria-label={t("signIn")} className={iconButton}>
                <User className="size-5" strokeWidth={1.8} />
              </button>
            )}

            <button type="button" onClick={() => { sound.open(); onCartOpen(); }} aria-label={t("cartItems", { count: cartCount })} className={iconButton}>
              <ShoppingBag className="size-5" strokeWidth={1.8} />
              {cartCount > 0 && (
                <span className="animate-pop absolute right-1.5 top-1.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-xs font-semibold leading-none text-primary-foreground ring-2 ring-background">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Wrapper carries the visibility: buttonVariants' own inline-flex would override `hidden`. */}
            <div className="ml-2 hidden md:block">
              <Link href="/order" prefetch={false} className={buttonVariants({ variant: "primary", size: "sm" })}>
                {t("createDesign")}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => { sound.toggle(!menuOpen); setMenuMounted(true); setMenuOpen(!menuOpen); }}
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              aria-expanded={menuOpen}
              className={`${iconButton} text-foreground lg:hidden`}
            >
              <Menu className="size-6" strokeWidth={1.8} />
            </button>
          </div>
        </div>
        </nav>
      </div>

      {menuMounted && <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} links={navLinks} contacts={contacts} />}
    </header>
  );
}

"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { User, ShoppingBag, Menu, Phone, Mail, Instagram, Send } from "lucide-react";
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

const iconButton =
  "relative flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const topLink =
  "inline-flex min-h-8 items-center gap-1.5 rounded-control text-muted-foreground transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Two-level header. Top bar (md+): phone, email and socials. It slides
 * away once the page scrolls, leaving the main bar: logo, navigation, account, cart
 * and the one primary action. `--header-height` in globals.css matches both heights.
 */
export function NavBar({ isLoggedIn, cartCount, contacts, onCartOpen, onAuthOpen }: NavBarProps) {
  const t = useTranslations("nav");
  const navLinks = [
    { href: "/#catalog", label: t("catalog") },
    { href: "/#how", label: t("how") },
    { href: "/biz", label: t("business") },
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out motion-reduce:transition-none ${
        scrolled ? "md:-translate-y-9" : ""
      }`}
    >
      {/* Top bar: contacts and secondary links, desktop only */}
      <div className="hidden h-9 border-b border-border/70 bg-background md:block">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-6 px-gutter text-xs">
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
            <a href={contacts.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={topLink}>
              <Instagram className="size-4" aria-hidden="true" />
            </a>
            <a href={contacts.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className={topLink}>
              <Send className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <nav aria-label={t("mainNav")} className="border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-gutter">
          <Link
            href="/"
            aria-label={t("logoLink")}
            className="mr-auto inline-flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:mr-0"
          >
            <BrandLogoFull className="h-7 w-auto" color="var(--color-primary)" />
          </Link>

          <ul className="mx-auto hidden items-center gap-1 lg:flex">
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

            <LanguageSwitcher />

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

      {menuMounted && <MobileMenuSheet open={menuOpen} onOpenChange={setMenuOpen} links={navLinks} contacts={contacts} />}
    </header>
  );
}

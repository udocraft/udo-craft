"use client";

import { Link } from "@/i18n/navigation";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, ShoppingBag, ArrowRight, X, Menu } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { sound } from "@/lib/sound";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

interface NavBarProps {
  isLoggedIn: boolean;
  cartCount: number;
  onCartOpen: () => void;
  cinemaMode: boolean;
  onAuthOpen?: () => void;
}

export function NavBar({ isLoggedIn, cartCount, onCartOpen, cinemaMode, onAuthOpen }: NavBarProps) {
  const t = useTranslations("nav");
  const navLinks = [
    { href: "/#catalog", label: t("catalog") },
    { href: "/#about", label: t("about") },
    { href: "/#how", label: t("how") },
    { href: "/#contact", label: t("contacts") },
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 80);

      if (y < 120) {
        setNavVisible(true);
      } else if (y > lastScrollY.current + 8) {
        // Scrolling down — hide
        setNavVisible(false);
      } else if (y < lastScrollY.current - 8) {
        // Scrolling up — show full
        setNavVisible(true);
      }

      lastScrollY.current = y;

      // Scroll stopped — show full nav after 500ms
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
      if (y > 120) {
        scrollStopTimer.current = setTimeout(() => {
          setNavVisible(true);
        }, 500);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollStopTimer.current) clearTimeout(scrollStopTimer.current);
    };
  }, []);

  const isLight = true; // always use light nav style

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{
        y: navVisible && !cinemaMode ? 0 : -80,
        opacity: navVisible && !cinemaMode ? 1 : 0,
      }}
      transition={{
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1],
        delay: navVisible && !scrolled ? 1.3 : 0,
      }}
      className="fixed inset-x-0 top-3 z-50 flex justify-center pointer-events-none px-3 sm:top-4 sm:px-4"
      aria-label={t("mainNav")}
    >
      <div
        className={`pointer-events-auto inline-flex h-14 items-center gap-1.5 rounded-full border px-3 shadow-[0_12px_40px_rgba(12,16,34,0.12)] backdrop-blur-2xl transition-all duration-300 md:h-12 md:gap-2 ${
          isLight
            ? "bg-background/90 border-border/80"
            : "bg-white/8 backdrop-blur-xl border-white/12 shadow-lg shadow-black/20"
        } md:h-12 h-14 md:px-3 px-4`}
      >
        {/* Logo — always using BrandLogoFull (SVG) */}
        <Link href="/" aria-label={t("logoLink")} className="inline-flex min-h-11 shrink-0 items-center pl-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
          <BrandLogoFull className="h-8 w-auto" color="var(--color-primary)" />
        </Link>

        {/* Nav links — always visible on desktop */}
        <div className="hidden md:flex items-center">
          <div className={`w-px h-5 shrink-0 mx-1 ${isLight ? "bg-border" : "bg-white/12"}`} aria-hidden="true" />
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`inline-flex min-h-11 items-center px-4 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isLight
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className={`w-px h-5 shrink-0 mx-1 ${isLight ? "bg-border" : "bg-white/12"}`} aria-hidden="true" />
        </div>

        {/* Actions — always visible */}
        <div className="flex items-center gap-1">
          {/* User icon — opens auth modal if not logged in, navigates to cabinet if logged in */}
          {isLoggedIn ? (
            <Link
              href="/cabinet"
              aria-label={t("goToAccount")}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isLight
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <User className="w-5 h-5" strokeWidth={2} />
            </Link>
          ) : (
            <button
              onClick={() => { sound.tap(); onAuthOpen?.(); }}
              aria-label={t("signIn")}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isLight
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <User className="w-5 h-5" strokeWidth={2} />
            </button>
          )}

          <button
            onClick={() => { sound.open(); onCartOpen(); }}
            aria-label={t("cartItems", { count: cartCount })}
            className={`relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isLight
                ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={2} />
            {cartCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center leading-none ring-2 ring-background"
              >
                {cartCount}
              </motion.span>
            )}
          </button>

          {/* CTA — always visible */}
          <Link
            href="/order"
            className={`hidden sm:inline-flex items-center gap-1.5 min-h-11 text-xs font-semibold px-5 py-2.5 rounded-full active:scale-95 transition-all duration-200 whitespace-nowrap ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              scrolled
                ? "bg-primary text-white hover:bg-primary/90"
                : "border border-primary text-primary hover:bg-primary hover:text-white"
            }`}
          >
            {t("startProject")} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>

          <LanguageSwitcher />

          <button
            onClick={() => { sound.toggle(!menuOpen); setMenuOpen(!menuOpen); }}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            className={`md:hidden flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-200 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isLight ? "hover:bg-muted text-foreground" : "hover:bg-white/10 text-white/70"
            }`}
          >
            {menuOpen ? <X className="w-6 h-6" strokeWidth={2} /> : <Menu className="w-6 h-6" strokeWidth={2} />}
          </button>
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-full gap-0 border-l border-border p-0 sm:max-w-sm">
          <div className="flex h-16 items-center border-b border-border px-6">
            <BrandLogoFull className="h-7 w-auto" color="var(--color-primary)" />
          </div>
          <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
          <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>
          <nav className="flex flex-1 flex-col gap-1 p-4" aria-label={t("mainNav")}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-4 text-base font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/order"
              onClick={() => setMenuOpen(false)}
              className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t("startProject")} <ArrowRight className="size-4" />
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </motion.nav>
  );
}

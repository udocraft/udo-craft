"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingBag, ArrowRight, X, Menu } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { sound } from "@/lib/sound";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
    { href: "/popup", label: t("popup") },
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
      className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4"
      aria-label={t("mainNav")}
    >
      <div
        className={`pointer-events-auto inline-flex items-center gap-2 h-12 px-3 rounded-full border transition-all duration-300 ${
          isLight
            ? "bg-background/90 backdrop-blur-xl border-border shadow-xl shadow-black/8"
            : "bg-white/8 backdrop-blur-xl border-white/12 shadow-lg shadow-black/20"
        } md:h-12 h-14 md:px-3 px-4`}
      >
        {/* Logo — always using BrandLogoFull (SVG) */}
        <Link href="/" aria-label={t("logoLink")} className="shrink-0 pl-1 pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
          <BrandLogoFull className="h-8 w-auto" color="var(--color-primary)" />
        </Link>

        {/* Nav links — always visible on desktop */}
        <div className="hidden md:flex items-center">
          <div className={`w-px h-5 shrink-0 mx-1 ${isLight ? "bg-border" : "bg-white/12"}`} aria-hidden="true" />
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
            aria-label={`Кошик — ${cartCount} товарів`}
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
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full active:scale-95 transition-all duration-200 whitespace-nowrap ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="absolute top-[calc(100%+8px)] left-4 right-4"
          >
            <div className="bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl px-4 py-3 space-y-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors duration-200"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/order"
                onClick={() => setMenuOpen(false)}
                className="block mt-1 text-center bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary/90 transition-colors duration-200"
              >
                {t("startProject")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingBag, ArrowRight, X, Menu } from "lucide-react";
import { BrandLogoFull } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { MockupViewer } from "@/components/MockupViewer";
import { AuthModal } from "@/components/AuthModal";

const NAV_LINKS = [
  { href: "/#catalog", label: "Каталог" },
  { href: "/popup",        label: "Popup" },
  { href: "/#how",         label: "Як це працює" },
  { href: "/#contact",     label: "Контакти" },
];

export function SiteHeader() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [navVisible, setNavVisible]   = useState(true);
  const [cartOpen, setCartOpen]       = useState(false);
  const [cartCount, setCartCount]     = useState(0);
  const [cart, setCart]               = useState<any[]>([]);
  const [totalCents, setTotalCents]   = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    void supabase.auth.getSession().then((r: Awaited<ReturnType<typeof supabase.auth.getSession>>) => setIsLoggedIn(!!r.data.session));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 60);
      if (y < 120) setNavVisible(true);
      else if (y > lastScrollY.current + 8) setNavVisible(false);
      else if (y < lastScrollY.current - 8) setNavVisible(true);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const readCart = () => {
      try {
        const raw = sessionStorage.getItem("client-order-draft");
        if (!raw) { setCartCount(0); setCart([]); setTotalCents(0); return; }
        const draft = JSON.parse(raw);
        const items = Array.isArray(draft.cart) ? draft.cart : [];
        setCart(items);
        setCartCount(items.length);
        setTotalCents(items.reduce((s: number, i: any) => s + (i.unitPriceCents + i.printCostCents) * i.quantity, 0));
      } catch { setCartCount(0); setCart([]); setTotalCents(0); }
    };
    readCart();
    window.addEventListener("storage", readCart);
    window.addEventListener("udo_cart_update", readCart);
    return () => {
      window.removeEventListener("storage", readCart);
      window.removeEventListener("udo_cart_update", readCart);
    };
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: navVisible ? 0 : -80, opacity: navVisible ? 1 : 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1], delay: !scrolled ? 0.3 : 0 }}
        className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4"
        aria-label="Головна навігація"
      >
        <div className={`pointer-events-auto inline-flex items-center gap-2 h-12 px-3 rounded-full bg-background border border-border transition-shadow duration-300 ${scrolled ? "shadow-lg" : "shadow-md"}`}>
          <Link href="/" aria-label="U:DO CRAFT" className="shrink-0 pl-1 pr-2">
            <BrandLogoFull className="h-6 w-auto" color="var(--color-primary, #1B18AC)" />
          </Link>
          <div className="hidden md:block w-px h-5 bg-border shrink-0" />
          <div className="hidden md:flex items-center">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="hidden md:block w-px h-5 bg-border shrink-0" />
          <div className="flex items-center gap-0.5">
            {isLoggedIn ? (
              <Link href="/cabinet" aria-label="Кабінет"
                className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <motion.div whileHover={{ y: -1.5 }} transition={{ duration: 0.2 }}>
                  <User className="w-4 h-4" strokeWidth={2} />
                </motion.div>
              </Link>
            ) : (
              <button onClick={() => setAuthModalOpen(true)} aria-label="Увійти"
                className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <motion.div whileHover={{ y: -1.5 }} transition={{ duration: 0.2 }}>
                  <User className="w-4 h-4" strokeWidth={2} />
                </motion.div>
              </button>
            )}
            <button onClick={() => setCartOpen(true)} aria-label="Кошик"
              className="relative flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <motion.div whileHover={{ y: 1.5, scale: 1.1 }} transition={{ duration: 0.2 }}>
                <ShoppingBag className="w-4 h-4" strokeWidth={2} />
              </motion.div>
              {cartCount > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cartCount}
                </motion.span>
              )}
            </button>
            <Link href="/order"
              className="hidden sm:inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-full hover:bg-primary/90 active:scale-95 transition-all duration-200 whitespace-nowrap ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Почати проєкт
              <ArrowRight className="w-3 h-3" />
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Закрити меню" : "Відкрити меню"}
              aria-expanded={menuOpen}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors duration-200 ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {menuOpen ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div key="mobile-menu"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
              className="absolute top-[calc(100%+8px)] left-4 right-4 rounded-2xl">
              <div className="bg-background border border-border shadow-xl rounded-2xl px-4 py-3 space-y-1">
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {l.label}
                  </Link>
                ))}
                <Link href="/order" onClick={() => setMenuOpen(false)}
                  className="block mt-1 text-center bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-primary/90 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Почати проєкт
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Auth modal — login/register without leaving the page */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialScreen="login"
        onAuthSuccess={() => {
          setIsLoggedIn(true);
          setAuthModalOpen(false);
          router.push("/cabinet");
        }}
      />

      {/* Cart sidebar */}
      <AnimatePresence>        {cartOpen && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} aria-hidden="true" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-background w-80 max-w-full h-full flex flex-col shadow-2xl" role="dialog" aria-modal="true" aria-label="Кошик">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm">Кошик {cartCount > 0 ? `(${cartCount})` : ""}</span>
                <button onClick={() => setCartOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              {cartCount === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                  <ShoppingBag className="size-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground font-medium">Кошик порожній</p>
                  <p className="text-xs text-muted-foreground/60">Оберіть товар та налаштуйте принт</p>
                  <Link href="/order" onClick={() => setCartOpen(false)}
                    className="mt-2 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors">
                    До каталогу <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {cart.map((item, i) => {
                      const lineTotal = (item.unitPriceCents + item.printCostCents) * item.quantity / 100;
                      return (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-lg">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-card border border-border">
                            <MockupViewer images={item.mockupsMap} frontUrl={item.mockupDataUrl} backUrl={item.mockupBackDataUrl} fallbackUrl={item.productImage} alt={item.productName} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{item.productName}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.quantity} шт · {item.size}</p>
                            <p className="text-xs font-bold text-primary mt-0.5">{lineTotal.toFixed(0)} ₴</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Разом:</span>
                      <span className="font-bold text-foreground">{(totalCents / 100).toFixed(0)} ₴</span>
                    </div>
                    <Link href="/order" onClick={() => setCartOpen(false)}
                      className="flex items-center justify-center gap-2 w-full bg-primary text-white text-sm font-bold py-3 rounded-full hover:bg-primary/90 transition-colors">
                      Оформити замовлення <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

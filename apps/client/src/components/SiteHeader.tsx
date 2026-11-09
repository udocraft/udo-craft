"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AuthModal } from "@/components/AuthModal";
import { CartSidebar } from "@/app/_components/CartSidebar";
import { NavBar } from "@/app/_components/NavBar";
import { useCart } from "@/hooks/useCart";
import { createClient } from "@/lib/supabase/client";

export function SiteHeader({ cinemaMode = false }: { cinemaMode?: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { cart, cartCount, totalCents } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then((result: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      if (active) setIsLoggedIn(!!result.data.session);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  return (
    <>
      <NavBar
        isLoggedIn={isLoggedIn}
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        cinemaMode={cinemaMode}
        onAuthOpen={() => setAuthOpen(true)}
      />
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        cartCount={cartCount}
        totalCents={totalCents}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthSuccess={() => {
          setIsLoggedIn(true);
          setAuthOpen(false);
          router.push("/cabinet");
        }}
      />
    </>
  );
}

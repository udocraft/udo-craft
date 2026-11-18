"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
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
        onAuthOpen={() => router.push("/cabinet/login")}
      />
      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        cartCount={cartCount}
        totalCents={totalCents}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { NavBar } from "@/app/_components/NavBar";
import { useCart } from "@/hooks/useCart";

// The cart sheet only matters once opened, and the session check pulls in the
// Supabase client (~70 kB gzip). Keep both out of the first-load bundle.
// Login opens the full-screen page at /cabinet/login.
const CartSidebar = dynamic(() => import("@/app/_components/CartSidebar").then((m) => m.CartSidebar), { ssr: false });

export function SiteHeader() {
  const router = useRouter();
  const { cart, cartCount, totalCents, startCheckout } = useCart();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartMounted, setCartMounted] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const result = await createClient().auth.getSession();
      if (active) setIsLoggedIn(!!result.data.session);
    };
    // After first paint: the account icon does not need the session to render.
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    const idle = typeof w.requestIdleCallback === "function";
    const handle = idle ? w.requestIdleCallback!(() => void check()) : window.setTimeout(() => void check(), 200);
    return () => {
      active = false;
      if (idle) w.cancelIdleCallback?.(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  return (
    <>
      <NavBar
        isLoggedIn={isLoggedIn}
        cartCount={cartCount}
        onCartOpen={() => {
          setCartMounted(true);
          setCartOpen(true);
        }}
        onAuthOpen={() => router.push("/cabinet/login")}
      />
      {cartMounted && (
        <CartSidebar
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          cart={cart}
          cartCount={cartCount}
          totalCents={totalCents}
          startCheckout={startCheckout}
        />
      )}
    </>
  );
}

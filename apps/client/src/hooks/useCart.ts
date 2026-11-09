"use client";

import { useState, useEffect } from "react";
import { migrateLegacyCheckoutCart } from "@/app/[locale]/order/_lib/cart-migration";

export interface CartItem {
  productName: string;
  quantity: number;
  size: string;
  unitPriceCents: number;
  printCostCents: number;
  mockupsMap?: Record<string, string>;
  mockupDataUrl?: string;
  mockupBackDataUrl?: string;
  productImage?: string;
}

export interface UseCartReturn {
  cart: CartItem[];
  cartCount: number;
  totalCents: number;
}

export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [totalCents, setTotalCents] = useState(0);

  const readCart = () => {
    try {
      const raw = sessionStorage.getItem("client-order-draft");
      const draft = raw ? JSON.parse(raw) : null;
      let cartItems: CartItem[] = Array.isArray(draft?.cart) ? draft.cart : [];
      if (cartItems.length === 0) {
        const legacyRaw = sessionStorage.getItem("udo_cart");
        if (legacyRaw) {
          const legacyCart = migrateLegacyCheckoutCart(JSON.parse(legacyRaw));
          if (legacyCart) {
            cartItems = legacyCart;
          } else {
            console.error("Failed to read the legacy checkout cart");
          }
        }
      }
      setCart(cartItems);
      setCartCount(cartItems.reduce((sum, item) => sum + item.quantity, 0));
      const total = cartItems.reduce((sum, item) => {
        return sum + (item.unitPriceCents + item.printCostCents) * item.quantity;
      }, 0);
      setTotalCents(total);
    } catch (error) {
      console.error("Failed to read the saved cart", error);
      setCart([]);
      setCartCount(0);
      setTotalCents(0);
    }
  };

  useEffect(() => {
    readCart();

    // Cross-tab sync via storage events
    window.addEventListener("storage", readCart);
    window.addEventListener("udo_cart_update", readCart);

    // Same-tab sync via BroadcastChannel
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("udo-cart");
    if (channel) channel.onmessage = () => readCart();

    return () => {
      window.removeEventListener("storage", readCart);
      window.removeEventListener("udo_cart_update", readCart);
      channel?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { cart, cartCount, totalCents };
}

"use client";

import { useState, useCallback, useEffect } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  productSlug: string;
  colorVariantId: string;
  colorName: string;
  hexCode: string;
  size: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl?: string;
}

const CART_KEY = "udo_craft_cart";

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveCart(items);
  }, [items, loaded]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(
        i => i.productId === item.productId && i.colorVariantId === item.colorVariantId && i.size === item.size
      );
      if (existing) {
        return prev.map(i =>
          i.productId === item.productId && i.colorVariantId === item.colorVariantId && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, colorVariantId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(
        i => !(i.productId === productId && i.colorVariantId === colorVariantId && i.size === size)
      ));
      return;
    }
    setItems(prev => prev.map(i =>
      i.productId === productId && i.colorVariantId === colorVariantId && i.size === size
        ? { ...i, quantity }
        : i
    ));
  }, []);

  const removeItem = useCallback((productId: string, colorVariantId: string, size: string) => {
    setItems(prev => prev.filter(
      i => !(i.productId === productId && i.colorVariantId === colorVariantId && i.size === size)
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    loaded,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalCents,
    totalItems,
  };
}

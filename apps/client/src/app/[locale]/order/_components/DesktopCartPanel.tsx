"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { MockupViewer } from "@/components/MockupViewer";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingCart, ChevronLeft } from "lucide-react";
import type { CartItem } from "./Customizer";

interface DesktopCartPanelProps {
  cart: CartItem[];
  totalCents: number;
  onCheckout: () => void;
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  /** When true, panel starts collapsed and shows only a toggle icon */
  collapsible?: boolean;
  /** Hide the panel entirely (e.g. on contact/review steps when collapsible) */
  hidden?: boolean;
}

export function DesktopCartPanel({ cart, totalCents, onCheckout, onEdit, onRemove, collapsible = false, hidden = false }: DesktopCartPanelProps) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const [collapsed, setCollapsed] = useState(collapsible);

  if (hidden) return null;

  // Collapsed: just a floating cart icon button on the right edge
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 right-0 z-40 flex-col items-center gap-1.5 bg-card border border-border border-r-0 rounded-l-2xl min-h-11 min-w-11 px-2 py-4 shadow-xl hover:bg-muted transition-colors"
        aria-label={tCart("ariaLabel")}
      >
        <ShoppingCart className="size-5 text-primary" />
        {cart.length > 0 && (
          <span className="bg-primary text-white text-xs font-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
            {cart.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="hidden lg:flex fixed top-0 right-0 bottom-0 z-40 w-80 border-l border-border bg-card flex-col shadow-xl">
      <div className="h-14 pl-4 pr-1.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">{tCart("titleWithCount", { count: cart.length })}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{(totalCents / 100).toFixed(0)} ₴</span>
          {collapsible && (
            <button onClick={() => setCollapsed(true)} className="flex size-11 items-center justify-center rounded-lg hover:bg-muted transition-colors" aria-label={tCart("collapse")}>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-12">
            <ShoppingCart className="size-10 opacity-30" />
            <p className="text-sm">{tCart("empty")}</p>
          </div>
        )}
        {cart.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="relative bg-card aspect-square">
              <MockupViewer
                images={item.mockupsMap}
                frontUrl={item.mockupDataUrl}
                backUrl={item.mockupBackDataUrl}
                fallbackUrl={item.productImage}
                alt={item.productName}
                size="lg"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2.5 space-y-1.5">
              <p className="text-xs font-semibold">{item.productName}</p>
              <p className="text-xs text-muted-foreground">{tCart("quantity", { qty: item.quantity, size: item.size })} · {item.color}</p>
              {item.layers && item.layers.length > 0 && (
                <div className="space-y-0.5 pt-0.5">
                  {item.layers.map((layer, li) => (
                    <p key={li} className="text-xs text-muted-foreground flex justify-between">
                      <span className="capitalize">{layer.type}{layer.sizeLabel ? ` · ${layer.sizeLabel}` : ""} ({layer.side})</span>
                      <span>{layer.priceCents != null ? `+${(layer.priceCents / 100).toFixed(0)} ₴` : "—"}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="pt-0.5 space-y-0.5 border-t border-border/50">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("subtotal")} × {item.quantity}</span>
                  <span>{(item.unitPriceCents * item.quantity / 100).toFixed(0)} ₴</span>
                </div>
                {item.printCostCents > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("printCost")} × {item.quantity}</span>
                    <span>+{(item.printCostCents * item.quantity / 100).toFixed(0)} ₴</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold text-primary">
                  <span>{t("total")}</span>
                  <span>{((item.unitPriceCents + item.printCostCents) * item.quantity / 100).toFixed(0)} ₴</span>
                </div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => onEdit(i)}
                  className="flex-1 min-h-11 cursor-pointer text-sm font-medium border border-border rounded-xl hover:bg-muted transition-colors text-center"
                >
                  {t("edit")}
                </button>
                <button
                  onClick={() => onRemove(i)}
                  aria-label={`${t("removeItem")}: ${item.productName}`}
                  className="cursor-pointer size-11 rounded-full border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-muted-foreground flex items-center justify-center"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 space-y-3 border-t border-border p-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>{t("subtotal")}</dt>
            <dd className="tabular-nums">{(cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) / 100).toFixed(0)} ₴</dd>
          </div>
          {cart.some((item) => item.printCostCents > 0) && (
            <div className="flex justify-between text-muted-foreground">
              <dt>{t("printCost")}</dt>
              <dd className="tabular-nums">{(cart.reduce((sum, item) => sum + item.printCostCents * item.quantity, 0) / 100).toFixed(0)} ₴</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-2">
            <dt className="font-medium">{t("total")}</dt>
            <dd className="text-lg font-semibold tabular-nums">{(totalCents / 100).toFixed(0)} ₴</dd>
          </div>
        </dl>
        <Button size="lg" className="w-full" onClick={onCheckout} disabled={cart.length === 0}>{t("placeOrder")}</Button>
      </div>
    </div>
  );
}

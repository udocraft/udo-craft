"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { MockupViewer } from "@/components/MockupViewer";
import { ShoppingCart, ChevronRight, Trash2 } from "lucide-react";
import type { CartItem } from "./Customizer";

export function MobileCartBar({ cart, totalCents, onCheckout, onRemove, onEdit, hidden }: {
  hidden?: boolean;
  cart: CartItem[];
  totalCents: number;
  onCheckout: () => void;
  onRemove: (i: number) => void;
  onEdit?: (i: number) => void;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const [open, setOpen] = useState(false);
  if (hidden || cart.length === 0) return null;

  return (
    <>
      <div data-sticky-bar className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pt-3 bg-card border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.08)]" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-transform">
          <div className="relative shrink-0">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2 bg-card text-primary text-xs font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">{cart.length}</span>
          </div>
          <span className="flex-1 text-left text-sm font-bold">{tCart("titleWithCount", { count: cart.length })}</span>
          <span className="text-sm font-black">{(totalCents / 100).toFixed(0)} ₴</span>
          <ChevronRight className="size-4 shrink-0 opacity-70" />
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-t-3xl flex flex-col max-h-[85dvh] shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4 text-muted-foreground" />
                <span className="text-base font-bold text-foreground">{tCart("title")}</span>
                <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label={t("back")} className="size-11 flex items-center justify-center rounded-full bg-muted hover:bg-muted/70 transition-colors">
                <span className="text-muted-foreground text-sm">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-2 space-y-2">
              {cart.map((item, i) => {
                const lineTotal = (item.unitPriceCents + item.printCostCents) * item.quantity / 100;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl">
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-card border border-border">
                      <MockupViewer images={item.mockupsMap} frontUrl={item.mockupDataUrl} backUrl={item.mockupBackDataUrl} fallbackUrl={item.productImage} alt={item.productName} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tCart("quantity", { qty: item.quantity, size: item.size })} · {item.color}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{lineTotal.toFixed(0)} ₴</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onEdit && (
                        <button onClick={() => { setOpen(false); onEdit(i); }}
                          className="h-11 px-3 rounded-xl text-sm font-semibold border border-border bg-background hover:bg-muted transition-colors">
                          {t("edit")}
                        </button>
                      )}
                      <button onClick={() => onRemove(i)} aria-label={`${t("removeItem")}: ${item.productName}`}
                        className="size-11 rounded-full border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-muted-foreground flex items-center justify-center">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="shrink-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("total")}</span>
                <span className="text-lg font-black text-foreground">{(totalCents / 100).toFixed(0)} ₴</span>
              </div>
              <button onClick={() => { setOpen(false); onCheckout(); }}
                className="w-full bg-primary text-primary-foreground text-sm font-bold py-4 rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {t("placeOrder")} <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

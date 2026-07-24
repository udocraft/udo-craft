"use client";

import Link from "next/link";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { MockupViewer } from "@/components/MockupViewer";
import type { CartItem } from "@/hooks/useCart";
import { useTranslations } from "next-intl";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartCount: number;
  totalCents: number;
}

export function CartSidebar({ open, onClose, cart, cartCount, totalCents }: CartSidebarProps) {
  const t = useTranslations("cart");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative bg-background w-80 max-w-full h-full flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={t("ariaLabel")}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-semibold text-sm tracking-tight">
            {cartCount > 0 ? t("titleWithCount", { count: cartCount }) : t("title")}
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {cartCount === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <ShoppingBag className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">{t("empty")}</p>
            <p className="text-xs text-muted-foreground/60">{t("emptyDesc")}</p>
            <Link
              href="/order"
              onClick={onClose}
              className="mt-2 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors"
            >
              {t("toCatalog")} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.map((item, i) => {
                const lineTotal =
                  ((item.unitPriceCents + item.printCostCents) * item.quantity) / 100;
                return (
                  <div key={i} className="flex items-center gap-2.5 p-2.5 bg-muted/50 rounded-xl">
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-card border border-border">
                      <MockupViewer
                        images={item.mockupsMap}
                        frontUrl={item.mockupDataUrl}
                        backUrl={item.mockupBackDataUrl}
                        fallbackUrl={item.productImage}
                        alt={item.productName}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {item.productName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t("quantity", { qty: item.quantity, size: item.size })}
                      </p>
                      <p className="text-xs font-bold text-primary mt-0.5">
                        {lineTotal.toFixed(0)} ₴
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted-foreground">{t("total")}</span>
                <span className="font-bold text-foreground">
                  {(totalCents / 100).toFixed(0)} ₴
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

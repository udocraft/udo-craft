"use client";

import { Link } from "@/i18n/navigation";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { MockupViewer } from "@/components/MockupViewer";
import type { CartItem } from "@/hooks/useCart";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface CartSidebarProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  cartCount: number;
  totalCents: number;
}

export function CartSidebar({ open, onClose, cart, cartCount, totalCents }: CartSidebarProps) {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-5 pr-14">
          <SheetTitle className="text-base font-semibold tracking-tight">
            {cartCount > 0 ? t("titleWithCount", { count: cartCount }) : t("title")}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("ariaLabel")}</SheetDescription>
        </SheetHeader>

        {cartCount === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground/50">
              <ShoppingBag className="size-6" />
            </div>
            <p className="text-sm font-medium text-foreground">{t("empty")}</p>
            <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">{t("emptyDesc")}</p>
            <Link
              href="/order"
              onClick={onClose}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t("toCatalog")} <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {cart.map((item, i) => {
                const lineTotal = ((item.unitPriceCents + item.printCostCents) * item.quantity) / 100;
                return (
                  <div key={`${item.productName}-${i}`} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted">
                      <MockupViewer
                        images={item.mockupsMap}
                        frontUrl={item.mockupDataUrl}
                        backUrl={item.mockupBackDataUrl}
                        fallbackUrl={item.productImage}
                        alt={item.productName}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("quantity", { qty: item.quantity, size: item.size })}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-foreground">{lineTotal.toFixed(0)} ₴</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-4 border-t border-border bg-background p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("total")}</span>
                <span className="text-lg font-semibold tracking-tight text-foreground">{(totalCents / 100).toFixed(0)} ₴</span>
              </div>
              <Link
                href="/order"
                onClick={onClose}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {tCheckout("orderTitle")} <ArrowRight className="size-4" />
              </Link>
              <p className="text-center text-xs text-muted-foreground">{tCheckout("finalPriceNote")}</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

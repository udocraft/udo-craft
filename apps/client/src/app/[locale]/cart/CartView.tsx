"use client";

import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";
import { MockupViewer } from "@/components/MockupViewer";
import { useCart } from "@/hooks/useCart";

const money = (cents: number) => `${(cents / 100).toFixed(0)} ₴`;

/**
 * Standalone cart. Reads the same saved draft as /order, so both stay in sync.
 * Quantity and print are edited in the customizer ("Edit"), where volume pricing is calculated.
 */
export function CartView() {
  const t = useTranslations("cart");
  const tCheckout = useTranslations("checkout");
  const tCol = useTranslations("collections");
  const { cart, totalCents, remove, startCheckout } = useCart();

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <ShoppingBag className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-h3 font-semibold">{t("empty")}</h1>
        <p className="text-sm text-muted-foreground">{t("emptyDesc")}</p>
        <Button asChild variant="primary" className="mt-2">
          <Link href="/order">{t("toCatalog")} <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </Button>
      </div>
    );
  }

  const hasUnpriced = cart.some((item) => item.unitPriceCents === 0);
  const checkout = (
    <Button asChild variant="primary" size="lg" className="w-full">
      <Link href="/order" onClick={startCheckout}>{tCheckout("placeOrder")} <ArrowRight className="size-4" aria-hidden="true" /></Link>
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <h1 className="mb-4 text-h3 font-semibold">{t("titleWithCount", { count: cart.length })}</h1>
        <ul className="divide-y divide-border rounded-card border border-border bg-card">
          {cart.map((item, i) => {
            const lineCents = (item.unitPriceCents + item.printCostCents) * item.quantity;
            return (
              <li key={i} className="flex gap-4 p-4 sm:p-5">
                <div className="size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:size-28">
                  <MockupViewer images={item.mockupsMap} frontUrl={item.mockupDataUrl ?? item.mockupUploadedUrl} backUrl={item.mockupBackDataUrl} fallbackUrl={item.productImage} alt={item.productName} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="shrink-0 font-semibold tabular-nums">{lineCents > 0 ? money(lineCents) : tCol("priceOnRequest")}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("quantity", { qty: item.quantity, size: item.size })}{item.color ? ` · ${item.color}` : ""}
                  </p>
                  {item.printCostCents > 0 && (
                    <p className="text-sm text-muted-foreground">{tCheckout("printCost")}: {money(item.printCostCents * item.quantity)}</p>
                  )}
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Button asChild variant="outline" size="sm" className="min-h-11">
                      <Link href={`/order?edit=${i}`}>{tCheckout("edit")}</Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`${tCheckout("removeItem")}: ${item.productName}`}
                      className="flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors duration-fast hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/order" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
          {t("continueShopping")}
        </Link>
      </div>

      <aside aria-labelledby="cart-summary-title" className="self-start rounded-card border border-border bg-card p-5 lg:sticky lg:top-24">
        <h2 id="cart-summary-title" className="text-h4 font-semibold">{tCheckout("summaryTitle")}</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{tCheckout("deliveryTitle")}</dt><dd>{tCheckout("byCarrier")}</dd></div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">{tCheckout("total")}</dt>
            <dd className="text-h3 font-semibold tabular-nums">{money(totalCents)}</dd>
          </div>
        </dl>
        {hasUnpriced && <p className="mt-2 text-sm text-muted-foreground">{t("requestNote")}</p>}
        <div className="mt-4 hidden lg:block">{checkout}</div>
        <p className="mt-3 text-xs text-muted-foreground">{tCheckout("finalPriceNote")}</p>
      </aside>

      <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {checkout}
      </div>
    </div>
  );
}

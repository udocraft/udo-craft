"use client";

import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_DISCOUNT_GRID } from "@udo-craft/shared";
import { AdminTablePanel } from "@/components/admin-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrintTypes } from "@/hooks/use-print-types";
import { cn } from "@/lib/utils";
import PriceGrid from "./PriceGrid";

export const DISCOUNTS_TAB = "discounts";

// Default volume discount from the shared order contract; products can override it.
const DISCOUNT_TIERS = [{ qty: 1, discount_pct: 0 }, ...DEFAULT_DISCOUNT_GRID].map((tier, i, all) => ({
  min: tier.qty,
  max: all[i + 1] ? all[i + 1].qty - 1 : Infinity,
  pct: tier.discount_pct,
}));

/**
 * «Ціни» tab of the Принти page: one sub-tab per print type (price grid by size and
 * quantity) plus volume discounts. Sub-tab lives in `?type=` so links can point at it.
 * Reports its "add price" handler to the page header (null on the discounts sub-tab).
 */
export default function PricesTab({ onCreateActionReady }: { onCreateActionReady: (handler: (() => void) | null) => void }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { types, loading } = usePrintTypes();

  const requested = searchParams.get("type");
  const sub = requested === DISCOUNTS_TAB ? DISCOUNTS_TAB : types.find((t) => t.id === requested)?.id ?? types[0]?.id ?? "";
  const current = types.find((t) => t.id === sub);

  // No add button on the discounts sub-tab.
  useEffect(() => {
    if (sub === DISCOUNTS_TAB || !current) onCreateActionReady(null);
  }, [sub, current, onCreateActionReady]);
  const onGridReady = useCallback((handler: () => void) => onCreateActionReady(handler), [onCreateActionReady]);

  const go = (next: string) => router.replace(`/prints?tab=prices&type=${encodeURIComponent(next)}`, { scroll: false });

  const subTabs = [
    ...types.map((t) => ({ key: t.id, label: t.label, hidden: !t.is_active })),
    { key: DISCOUNTS_TAB, label: "Знижки за кількість", hidden: false },
  ];

  return (
    <div className="pt-4">
      {/* Sub-tabs: segmented pills, so they read as a level below the page tabs. */}
      <div className="px-4 pb-4 md:px-6">
        {loading && types.length === 0 ? (
          <div className="flex h-9 items-center gap-2">
            {[72, 88, 96, 120].map((w) => <Skeleton key={w} className="h-8 rounded-full" style={{ width: w }} />)}
          </div>
        ) : (
          <div role="tablist" aria-label="Тип друку" className="flex flex-wrap gap-1.5">
            {subTabs.map((t) => {
              const active = t.key === sub;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => go(t.key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {t.label}
                  {t.hidden && <span className={cn("text-xs font-normal", active ? "text-primary-foreground/80" : "text-muted-foreground")}>· приховано</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {sub === DISCOUNTS_TAB ? (
        <div className="px-4 pb-6 md:px-6">
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
            Знижка на все замовлення залежно від кількості одиниць. Діє за замовчуванням; у товарі можна задати власну сітку.
          </p>
          <AdminTablePanel bleed>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Кількість</TableHead>
                  <TableHead>Знижка</TableHead>
                  <TableHead>Приклад (від 100 ₴)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DISCOUNT_TIERS.map((tier) => (
                  <TableRow key={tier.min}>
                    <TableCell className="font-medium tabular-nums">
                      {tier.min}–{tier.max === Infinity ? "∞" : tier.max} шт
                    </TableCell>
                    <TableCell>
                      <span className={tier.pct > 0 ? "rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary" : "text-muted-foreground"}>
                        {tier.pct}%
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {tier.pct > 0 ? (
                        <><span className="line-through">100 ₴</span><span className="ml-2 font-medium text-foreground">{100 - tier.pct} ₴</span></>
                      ) : "100 ₴"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminTablePanel>
        </div>
      ) : current ? (
        <PriceGrid key={current.id} printType={current.id} printTypeLabel={current.label} onCreateActionReady={onGridReady} />
      ) : null}
    </div>
  );
}

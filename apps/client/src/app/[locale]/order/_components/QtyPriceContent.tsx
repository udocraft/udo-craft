"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Loader2, Plus, Minus } from "lucide-react";
import type { PrintLayer } from "@udo-craft/shared";
import type { PrintTypePricingRow } from "@/components/LayersPanel";

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithDiscountGrid {
  base_price_cents: number;
  available_sizes?: string[];
  discount_grid?: { qty: number; discount_pct: number }[];
  [key: string]: unknown;
}

export interface QtyPriceContentProps {
  product: ProductWithDiscountGrid;
  quantity: number;
  qtyStr: string;
  setQuantity: (n: number) => void;
  setQtyStr: (s: string) => void;
  discountPct: number;
  unitPrice: number;
  discounted: number;
  printCostPerUnit: number;
  total: number;
  layers: PrintLayer[];
  pricing: PrintTypePricingRow[];
  itemNote: string;
  setItemNote: (s: string) => void;
  onAddToCart: (() => void) | null;
  loading?: boolean;
  showTitle?: boolean;
  addDisabled?: boolean;
  addDisabledReason?: string | null;
  disabled?: boolean;
  hideButton?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────

export function QtyPriceContent({
  product,
  quantity,
  qtyStr,
  setQuantity,
  setQtyStr,
  discountPct,
  unitPrice,
  discounted,
  printCostPerUnit,
  total,
  layers,
  pricing,
  itemNote,
  setItemNote,
  onAddToCart,
  loading,
  showTitle = true,
  addDisabled = false,
  addDisabledReason = null,
  disabled = false,
  hideButton = false,
}: QtyPriceContentProps) {
  const [noteOpen, setNoteOpen] = React.useState(false);
  const sortedDiscounts = [...(product.discount_grid ?? [])].sort((a, b) => a.qty - b.qty);

  return (
    <div className={`space-y-5 pb-4 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {showTitle && (
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Тираж та ціна
        </p>
      )}

      {/* Quantity stepper */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { const n = Math.max(1, quantity - 1); setQuantity(n); setQtyStr(String(n)); }}
          disabled={disabled}
          className="cursor-pointer size-8 rounded-lg border border-border flex items-center justify-center text-base font-medium hover:bg-muted transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >−</button>
        <input
          type="number"
          min={1}
          value={qtyStr}
          disabled={disabled}
          onChange={(e) => {
            const next = Math.max(1, parseInt(e.target.value) || 1);
            setQuantity(next);
            setQtyStr(String(next));
          }}
          onBlur={() => {
            const safe = Math.max(1, parseInt(qtyStr) || 1);
            setQuantity(safe);
            setQtyStr(String(safe));
          }}
          className="flex-1 min-w-0 text-center text-xl font-bold tabular-nums border border-border rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-primary bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => { const n = quantity + 1; setQuantity(n); setQtyStr(String(n)); }}
          disabled={disabled}
          className="cursor-pointer size-8 rounded-lg border border-border flex items-center justify-center text-base font-medium hover:bg-muted transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >+</button>
      </div>

      {sortedDiscounts.length > 0 && (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${sortedDiscounts.length}, minmax(0, 1fr))` }}
        >
          {sortedDiscounts.map((tier, index) => {
            const nextQty = sortedDiscounts[index + 1]?.qty;
            const active = quantity >= tier.qty && (nextQty === undefined || quantity < nextQty);
            return (
              <button
                key={tier.qty}
                type="button"
                disabled={disabled}
                onClick={() => { setQuantity(tier.qty); setQtyStr(String(tier.qty)); }}
                className={`cursor-pointer rounded-xl border px-1 py-2 text-center text-xs transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                  active
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-primary/40 text-primary hover:border-primary hover:bg-primary/5"
                }`}
              >
                <div className="font-bold whitespace-nowrap">від {tier.qty}</div>
                <div className="text-[10px] opacity-80">−{tier.discount_pct}%</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Price breakdown */}
      {(() => {
        const printTypeLabels: Record<string, string> = {
          dtf: "DTF", embroidery: "Вишивка", screen: "Шовкодрук",
          sublimation: "Сублімація", patch: "Нашивка",
        };

        // Per-layer print cost with qty-tier pricing
        const layerBreakdown = layers.map((layer) => {
          const rows = pricing.filter((r) => r.print_type === layer.type);
          const sizeLabel = layer.sizeLabel as string | undefined;
          const row = rows.length && sizeLabel
            ? (rows.find((r) => r.size_label === sizeLabel) ?? null)
            : null;
          const sortedTiers = row ? [...row.qty_tiers].sort((a, b) => b.min_qty - a.min_qty) : [];
          const tier = sortedTiers.find((t) => quantity >= t.min_qty) ?? sortedTiers[sortedTiers.length - 1];
          // Find base tier (qty=1 or lowest)
          const baseTier = sortedTiers.length
            ? sortedTiers[sortedTiers.length - 1]
            : null;
          const basePriceCents = baseTier?.price_cents ?? layer.priceCents ?? 0;
          const priceCents = tier?.price_cents ?? layer.priceCents ?? 0;
          const hasDiscount = basePriceCents > 0 && priceCents < basePriceCents;
          const discountPctPrint = hasDiscount
            ? Math.round((1 - priceCents / basePriceCents) * 100)
            : 0;
          return {
            layer,
            sizeLabel,
            priceCents,
            basePriceCents,
            hasDiscount: hasDiscount && discountPctPrint > 0,
            discountPctPrint,
            label: printTypeLabels[layer.type] ?? layer.type,
          };
        });

        const totalPrintCents = layerBreakdown.reduce((s, l) => s + l.priceCents, 0);
        const totalPrintBaseCents = layerBreakdown.reduce((s, l) => s + l.basePriceCents, 0);
        const itemBaseCents = product.base_price_cents;
        const itemDiscountedCents = Math.round(itemBaseCents * (1 - discountPct / 100));
        const savingsPerUnit = (itemBaseCents - itemDiscountedCents) + (totalPrintBaseCents - totalPrintCents);
        const totalSavings = savingsPerUnit * quantity;

        return (
          <div className="rounded-xl border border-border/40 bg-muted/30 overflow-hidden">
            {/* Item row */}
            <div className="px-3.5 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Товар</p>
                {discountPct > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="line-through">{(itemBaseCents / 100).toFixed(0)} ₴</span>
                    <span className="ml-1.5 text-emerald-600 font-semibold">−{discountPct}%</span>
                  </p>
                )}
              </div>
              <p className="text-sm font-semibold shrink-0 tabular-nums">
                {(itemDiscountedCents / 100).toFixed(0)} ₴<span className="text-muted-foreground font-normal">/шт</span>
              </p>
            </div>

            {/* Print layers */}
            {layerBreakdown.length > 0 && (
              <div className="border-t border-border/40">
                {layerBreakdown.map(({ layer, sizeLabel, priceCents, basePriceCents, hasDiscount, discountPctPrint, label }) => (
                  <div key={layer.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 border-b border-border/20 last:border-b-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        {sizeLabel && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{sizeLabel}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground opacity-60">{layer.side}</span>
                      </div>
                      {hasDiscount && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="line-through">{(basePriceCents / 100).toFixed(0)} ₴</span>
                          <span className="ml-1.5 text-emerald-600 font-semibold">−{discountPctPrint}%</span>
                        </p>
                      )}
                      {!sizeLabel && (
                        <p className="text-[11px] text-amber-600 mt-0.5">Оберіть розмір</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold shrink-0 tabular-nums">
                      {sizeLabel
                        ? priceCents > 0
                          ? <>{(priceCents / 100).toFixed(0)} ₴<span className="text-muted-foreground font-normal">/шт</span></>
                          : <span className="text-muted-foreground">—</span>
                        : <span className="text-muted-foreground text-xs">—</span>
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Savings row */}
            {totalSavings > 0 && (
              <div className="border-t border-border/40 px-3.5 py-2.5 flex items-center justify-between gap-2 bg-emerald-50/60">
                <p className="text-sm text-emerald-700 font-medium">Економія</p>
                <p className="text-sm font-semibold text-emerald-700 tabular-nums">−{(totalSavings / 100).toFixed(0)} ₴</p>
              </div>
            )}

            {/* Total row */}
            <div className="border-t border-border/60 px-3.5 py-3 flex items-baseline justify-between gap-2 bg-background/60">
              <div>
                <p className="text-base font-bold">Разом</p>
                {quantity > 1 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {quantity} шт × {((itemDiscountedCents / 100) + (totalPrintCents / 100)).toFixed(0)} ₴
                  </p>
                )}
              </div>
              <div className="flex items-baseline gap-1 ml-auto">
                <AnimatedNumber value={total} decimals={0} className="text-xl font-black text-primary tabular-nums" />
                <span className="text-base font-bold text-primary">₴</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Disclaimer — right below total */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
        <p className="text-xs text-amber-900">
          <span className="font-semibold">Важливо:</span> Ціни є орієнтовними. Остаточна вартість може змінитися після обговорення з менеджером.
        </p>
      </div>

      {/* Item note — collapsible accordion with smooth animation */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Нотатка до позиції</span>
          {noteOpen ? <Minus className="size-3.5 text-muted-foreground shrink-0" /> : <Plus className="size-3.5 text-muted-foreground shrink-0" />}
        </button>
        <AnimatePresence initial={false}>
          {noteOpen && (
            <motion.div
              key="note"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <textarea
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  disabled={disabled}
                  placeholder="Особливі побажання..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors placeholder:text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add to cart button */}
      {onAddToCart && !hideButton && (
        <>
          {addDisabledReason && !loading && (
            <p className="text-xs text-amber-600">{addDisabledReason}</p>
          )}
          <Button
            className="w-full h-11 text-sm font-semibold cursor-pointer"
            disabled={loading || addDisabled}
            onClick={onAddToCart}
          >
            {loading
              ? <><Loader2 className="size-3.5 animate-spin" /> Додаємо...</>
              : "Додати до замовлення"}
          </Button>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { MockupViewer } from "@/components/MockupViewer";
import { AnimatedNumber } from "@/components/AnimatedNumber";
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
  const [collapsed, setCollapsed] = useState(collapsible);

  if (hidden) return null;

  // Collapsed: just a floating cart icon button on the right edge
  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:flex fixed top-1/2 -translate-y-1/2 right-0 z-40 flex-col items-center gap-1.5 bg-card border border-border border-r-0 rounded-l-2xl px-2 py-4 shadow-xl hover:bg-muted transition-colors"
        aria-label="Відкрити кошик"
      >
        <ShoppingCart className="size-5 text-primary" />
        {cart.length > 0 && (
          <span className="bg-primary text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center leading-none">
            {cart.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="hidden lg:flex fixed top-0 right-0 bottom-0 z-40 w-80 border-l border-border bg-card flex-col shadow-xl">
      <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">Кошик ({cart.length})</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{(totalCents / 100).toFixed(0)} ₴</span>
          {collapsible && (
            <button onClick={() => setCollapsed(true)} className="p-1 rounded-lg hover:bg-muted transition-colors" aria-label="Згорнути кошик">
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-12">
            <ShoppingCart className="size-10 opacity-30" />
            <p className="text-sm">Кошик порожній</p>
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
              <p className="text-xs text-muted-foreground">{item.quantity} шт. · {item.size} · {item.color}</p>
              {item.layers && item.layers.length > 0 && (
                <div className="space-y-0.5 pt-0.5">
                  {item.layers.map((layer, li) => (
                    <p key={li} className="text-[10px] text-muted-foreground flex justify-between">
                      <span className="capitalize">{layer.type}{layer.sizeLabel ? ` · ${layer.sizeLabel}` : ""} ({layer.side})</span>
                      <span>{layer.priceCents != null ? `+${(layer.priceCents / 100).toFixed(0)} ₴/шт` : "—"}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="pt-0.5 space-y-0.5 border-t border-border/50">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Товар × {item.quantity}</span>
                  <span>{(item.unitPriceCents * item.quantity / 100).toFixed(0)} ₴</span>
                </div>
                {item.printCostCents > 0 && (
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Нанесення × {item.quantity}</span>
                    <span>+{(item.printCostCents * item.quantity / 100).toFixed(0)} ₴</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold text-primary">
                  <span>Разом</span>
                  <span>{((item.unitPriceCents + item.printCostCents) * item.quantity / 100).toFixed(0)} ₴</span>
                </div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => onEdit(i)}
                  className="flex-1 cursor-pointer text-[10px] font-medium border border-border rounded-xl py-1 hover:bg-muted transition-colors text-center"
                >
                  Редагувати
                </button>
                <button
                  onClick={() => onRemove(i)}
                  className="cursor-pointer size-6 rounded-full border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-muted-foreground flex items-center justify-center"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-muted/30 border-t border-dashed border-border shrink-0 space-y-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--color-border)_20%,_transparent_20%)] bg-[length:10px_10px]" />
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>Сума товарів:</span>
            <span>{(cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) / 100).toFixed(0)} ₴</span>
          </div>
          {cart.some(item => item.printCostCents > 0) && (
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>Вартість нанесення:</span>
              <span>{(cart.reduce((sum, item) => sum + item.printCostCents * item.quantity, 0) / 100).toFixed(0)} ₴</span>
            </div>
          )}
          <div className="border-t border-dotted border-border/80 my-2 pt-2 flex justify-between items-baseline text-base font-black">
            <span className="uppercase tracking-wider text-xs text-foreground">Загалом до сплати</span>
            <div className="font-mono text-primary flex items-baseline gap-1 text-lg">
              <AnimatedNumber value={totalCents / 100} decimals={0} className="font-black" />
              <span className="text-sm font-bold">₴</span>
            </div>
          </div>
        </div>
        <Button className="w-full cursor-pointer rounded-full shadow-md hover:shadow-lg transition-all" onClick={onCheckout}>Оформити замовлення →</Button>
      </div>
    </div>
  );
}

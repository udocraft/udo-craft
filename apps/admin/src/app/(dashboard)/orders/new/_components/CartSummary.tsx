"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { MockupViewer } from "@/components/mockup-viewer";
import { ChevronLeft, ShoppingCart, Trash2 } from "lucide-react";
import type { PrintLayer } from "@/components/print-types";
import type { ProductColorVariant, Material, Product } from "@udo-craft/shared";
import { Badge } from "@/components/ui/badge";

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  unitPriceCents: number;
  printCostCents: number;
  quantity: number;
  size: string;
  color: string;
  itemNote?: string;
  layers?: PrintLayer[];
  mockupDataUrl?: string;
  mockupUploadedUrl?: string;
  mockupBackDataUrl?: string;
  mockupsMap?: Record<string, string>;
  offsetTopMm?: number;
}

// ── Desktop cart side panel ───────────────────────────────────────────────

interface DesktopCartPanelProps {
  cart: CartItem[];
  totalCents: number;
  products: ProductWithConfig[];
  variants: ProductColorVariant[];
  materials: Material[];
  onEdit: (i: number) => void;
  onRemove: (i: number) => void;
  onCheckout: () => void;
  collapsible?: boolean;
  hidden?: boolean;
}

export function DesktopCartPanel({
  cart,
  totalCents,
  products,
  onEdit,
  onRemove,
  onCheckout,
  collapsible = false,
  hidden = false,
}: DesktopCartPanelProps) {
  const [collapsed, setCollapsed] = React.useState(collapsible);

  if (hidden) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="hidden lg:flex fixed top-1/2 right-0 z-40 -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-2xl border border-r-0 border-border bg-background px-2 py-4 shadow-xl transition-colors hover:bg-muted"
        aria-label="Відкрити кошик"
      >
        <ShoppingCart className="size-5 text-primary" />
        {cart.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black leading-none text-primary-foreground">
            {cart.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="hidden lg:flex fixed top-16 right-0 bottom-0 z-30 w-80 flex-col border-l border-border bg-background shadow-xl selection:bg-primary/10">
      <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
            <ShoppingCart className="size-4 text-primary" />
          </div>
          <span className="font-bold text-sm">Кошик ({cart.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-bold text-[10px] h-6 px-2 bg-muted/30">
            ₴{(totalCents / 100).toFixed(0)}
          </Badge>
          {collapsible && (
            <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Згорнути кошик">
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground py-12">
            <ShoppingCart className="size-10 opacity-30" />
            <p className="text-sm font-medium">Кошик порожній</p>
            <p className="max-w-44 text-xs">Додайте товари з каталогу, щоб оформити замовлення.</p>
          </div>
        ) : (
          cart.map((item, i) => {
            const prod = products.find((p) => p.id === item.productId);
            return (
              <div key={i} className="group rounded-xl border border-border bg-card overflow-hidden">
                <div className="relative aspect-square bg-muted/20">
                  <MockupViewer
                    images={item.mockupsMap}
                    frontUrl={item.mockupDataUrl}
                    backUrl={item.mockupBackDataUrl}
                    fallbackUrl={item.productImage}
                    alt={item.productName}
                    size="lg"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => onRemove(i)}
                    className="absolute top-3 right-3 size-8 rounded-full border border-border bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold line-clamp-2">{item.productName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.quantity} шт. · {item.size} · {item.color}</p>
                  </div>

                  {item.layers && item.layers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.layers.map((layer, li) => (
                        <Badge key={li} variant="secondary" className="text-[9px] h-5 px-1.5">
                          {layer.side}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground">Разом</span>
                    <span className="text-sm font-bold text-primary">
                      ₴{((item.unitPriceCents + item.printCostCents) * item.quantity / 100).toFixed(0)}
                    </span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { if (!prod) return; onEdit(i); }}
                    className="w-full h-9 rounded-full text-xs font-semibold"
                  >
                    Редагувати
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border bg-background space-y-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Загальна сума</span>
            <p className="text-2xl font-black text-foreground tracking-tight">₴{(totalCents / 100).toFixed(0)}</p>
          </div>
          <Badge variant="outline" className="h-7 px-3 font-bold text-[10px]">
            {cart.length} позицій
          </Badge>
        </div>
        
        <Button 
          className="w-full h-11 rounded-full font-semibold"
          onClick={onCheckout}
          disabled={cart.length === 0}
        >
          <span>Перейти до контактів</span>
          <ShoppingCart className="size-4" />
        </Button>
      </div>
    </div>
  );
}


// ── Mobile cart drawer — see MobileAdminCart.tsx ─────────────────────────

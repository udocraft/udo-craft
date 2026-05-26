"use client";

import React, { useState } from "react";
import { Product, Material, ProductColorVariant, resolveProductImages, getCustomizableImages } from "@udo-craft/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CircleSlash, ToolCase } from "lucide-react";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
}

interface ProductCardInlineProps {
  product: ProductWithConfig;
  variants: ProductColorVariant[];
  materials: Material[];
  onOpen: (variant: ProductColorVariant | null, size?: string | null) => void;
  onAddWithoutPrint: (variant: ProductColorVariant | null, size?: string | null) => void;
}

const FALLBACK_COLORS = [
  { name: "Чорний",      hex: "#1a1a1a", border: false },
  { name: "Білий",       hex: "#f0f0f0", border: true  },
  { name: "Сірий",       hex: "#9ca3af", border: false },
  { name: "Темно-синій", hex: "#1e3a5f", border: false },
  { name: "Синій",       hex: "#2563eb", border: false },
  { name: "Червоний",    hex: "#dc2626", border: false },
];

function pickMiddleSize(sizes: string[]): string | null {
  if (!sizes.length) return null;
  return sizes[Math.floor(sizes.length / 2)];
}

export function ProductCardInline({ product, variants, materials, onOpen, onAddWithoutPrint }: ProductCardInlineProps) {
  const isOutOfStock = !product.is_active;
  const hasVariants = variants.length > 0;

  const [activeVariantId, setActiveVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const displayVariantId = hoveredVariantId ?? activeVariantId;
  const activeVariant = hasVariants ? variants.find((v) => v.id === displayVariantId) ?? null : null;

  const imgs = (() => {
    const productImgs = resolveProductImages(product.product_images, product.images);
    const variantImgs = activeVariant ? resolveProductImages(activeVariant.variant_images, activeVariant.images) : null;
    return getCustomizableImages(variantImgs?.length ? variantImgs : productImgs);
  })();
  const imgUrl = imgs.front ?? Object.values(imgs)[0] ?? "";

  const colorDots = hasVariants && materials
    ? variants.map((v) => {
        const mat = materials.find((m) => m.id === v.material_id);
        const hex = mat?.hex_code || "#ccc";
        return { id: v.id, name: mat?.name || "Невідомий", hex, border: hex.toLowerCase() === "#f0f0f0" || hex.toLowerCase() === "#ffffff" };
      })
    : FALLBACK_COLORS.map((c) => ({ id: c.name, name: c.name, hex: c.hex, border: c.border }));

  const sizes = (product.available_sizes as string[]) ?? [];
  const actionsVisible = sizes.length === 0 || selectedSize !== null;

  const resolveSize = () => selectedSize ?? pickMiddleSize(sizes);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    const size = resolveSize();
    if (size && !selectedSize) setSelectedSize(size);
    onOpen(activeVariant, size);
  };

  return (
    <Card
      onClick={handleCardClick}
      className={`group relative overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-primary/20 ${
        isOutOfStock ? "opacity-60 grayscale pointer-events-none" : ""
      }`}
    >
      <div className="relative aspect-square bg-muted/30 p-6 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/[0.02]" />
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={product.name} 
            className="w-full h-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-110" 
          />
        ) : (
          <div className="text-muted-foreground/20">
            <svg className="size-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {isOutOfStock && (
          <Badge variant="destructive" className="absolute top-3 right-3">Немає в наявності</Badge>
        )}
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <span className="text-sm font-black text-primary shrink-0">
              ₴{(product.base_price_cents / 100).toFixed(0)}
            </span>
          </div>
          {product.description && (
            <div className="relative">
              <p className={`text-[11px] font-medium text-muted-foreground/70 leading-relaxed ${descExpanded ? "" : "line-clamp-2"}`}>
                {product.description}
              </p>
              {product.description.length > 80 && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                  className="text-[10px] font-bold text-primary hover:underline mt-1 uppercase tracking-widest"
                >
                  {descExpanded ? "Згорнути" : "Детальніше"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 min-h-[40px]">
          {sizes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sizes.map((size) => (
                <button 
                  key={size} 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(selectedSize === size ? null : size); }}
                  className={`min-w-[32px] h-7 text-[10px] font-bold rounded-lg border transition-all ${
                    selectedSize === size
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-muted/40 text-muted-foreground border-border/50 hover:border-foreground/20 hover:bg-muted/60"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {colorDots.map((c) => (
              <button 
                key={c.id} 
                type="button" 
                title={c.name}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasVariants) return;
                  setActiveVariantId(c.id === activeVariantId ? null : c.id);
                }}
                onMouseEnter={() => hasVariants && setHoveredVariantId(c.id)}
                onMouseLeave={() => setHoveredVariantId(null)}
                className={`size-5 rounded-full border border-black/5 transition-all duration-200 ${
                  hasVariants && displayVariantId === c.id 
                    ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-md" 
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-2 transition-all duration-300 origin-top ${actionsVisible ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 h-0 overflow-hidden"}`}>
          <Button 
            size="sm"
            onClick={(e) => { e.stopPropagation(); onOpen(activeVariant, resolveSize()); }}
            className="w-full gap-2 font-bold text-xs"
          >
            <ToolCase className="size-5" />
            Додати принт
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAddWithoutPrint(activeVariant, resolveSize()); }}
            className="w-full gap-2 border-border/60 font-bold text-xs"
          >
            <CircleSlash className="size-5" />
            Без принту
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

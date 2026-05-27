"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleSlash, ToolCase } from "lucide-react";
import { Product, ProductColorVariant, Material, resolveProductImages, getAllImages } from "@udo-craft/shared";

interface ProductCardDetailedProps {
  product: Product;
  colorVariants?: ProductColorVariant[];
  materials?: Material[];
  onCustomize?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
  onAddWithoutPrint?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
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

export function ProductCardDetailed({
  product, colorVariants, materials, onCustomize, onAddWithoutPrint,
}: ProductCardDetailedProps) {
  const router = useRouter();
  const isOutOfStock = !product.is_active;
  const hasVariants = colorVariants && colorVariants.length > 0;

  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    hasVariants ? colorVariants[0].id : null
  );
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const displayVariantId = hoveredVariantId ?? activeVariantId;
  const activeVariant = hasVariants
    ? colorVariants.find((v) => v.id === displayVariantId) ?? null
    : null;

  // Resolve images using new model with legacy fallback
  const productImgs = resolveProductImages((product as any).product_images, product.images);
  const variantImgs = activeVariant ? resolveProductImages((activeVariant as any).variant_images, activeVariant.images) : null;
  const currentImages = getAllImages(variantImgs?.length ? variantImgs : productImgs);
  const availableImages = Object.values(currentImages).filter(Boolean);
  const imageUrl = availableImages[imgIndex % availableImages.length] ?? "";

  const colorDots =
    hasVariants && materials
      ? colorVariants.map((v) => {
          const mat = materials.find((m) => m.id === v.material_id);
          const hex = mat?.hex_code || "#ccc";
          return { id: v.id, name: mat?.name || "Невідомий", hex, border: hex.toLowerCase() === "#f0f0f0" || hex.toLowerCase() === "#ffffff" };
        })
      : FALLBACK_COLORS.map((c) => ({ id: c.name, name: c.name, hex: c.hex, border: c.border }));

  const sizes = product.available_sizes || [];
  const actionsVisible = sizes.length === 0 || selectedSize !== null;

  const getActiveColor = () => {
    if (!activeVariantId || !hasVariants) return null;
    return materials?.find((m) => m.id === colorVariants?.find((v) => v.id === activeVariantId)?.material_id)?.name ?? null;
  };

  // Resolve size to use — selected or auto-pick middle
  const resolveSize = () => selectedSize ?? pickMiddleSize(sizes);

  const handleCardClick = () => {
    if (isOutOfStock) return;
    // Navigate to product detail page
    router.push(`/products/${product.slug || product.id}`);
  };

  const handleAddPrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const size = resolveSize();
    if (onCustomize) { onCustomize(product, size, getActiveColor(), activeVariant); return; }
    const params = new URLSearchParams({ product: product.slug || product.id, customize: "1" });
    if (size) params.set("size", size);
    const color = getActiveColor();
    if (color) params.set("color", color);
    if (activeVariant?.id) params.set("variant", activeVariant.id);
    router.push(`/order?${params.toString()}`);
  };

  const handleAddWithoutPrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const size = resolveSize();
    if (onAddWithoutPrint) { onAddWithoutPrint(product, size, getActiveColor(), activeVariant); return; }
    const params = new URLSearchParams({ product: product.slug || product.id, add: "1" });
    if (size) params.set("size", size);
    const color = getActiveColor();
    if (color) params.set("color", color);
    if (activeVariant?.id) params.set("variant", activeVariant.id);
    router.push(`/order?${params.toString()}`);
  };

  return (
    <div
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-label={`Переглянути ${product.name}`}
      aria-disabled={isOutOfStock}
      onClick={handleCardClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleCardClick(); }}
      className={`bg-muted rounded-2xl overflow-hidden flex flex-col h-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isOutOfStock ? "opacity-60 pointer-events-none" : ""}`}
    >
      {/* Image */}
      <div className="p-3 sm:p-4 w-full flex items-center justify-center aspect-square flex-shrink-0 relative overflow-hidden group/img">
        {imageUrl ? (
          <div className="relative w-full h-full">
            <Image src={imageUrl} alt={product.name} fill className="object-contain" />
            {availableImages.length > 1 && (
              <div className="absolute inset-y-0 inset-x-1 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none z-10">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImgIndex((prev) => (prev - 1 + availableImages.length) % availableImages.length); }}
                  className="size-7 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Попереднє зображення"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setImgIndex((prev) => (prev + 1) % availableImages.length); }}
                  className="size-7 rounded-full bg-background/80 hover:bg-background text-foreground flex items-center justify-center shadow-md backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 pointer-events-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Наступне зображення"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 flex flex-col gap-2">
        {/* Name + price + description */}
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
            <p className="text-sm font-bold text-primary shrink-0">від ₴{(product.base_price_cents / 100).toFixed(0)}</p>
          </div>
          {product.description && (
            <div className="mt-1">
              <p className={`text-xs text-muted-foreground ${descExpanded ? "" : "line-clamp-2"}`}>
                {product.description}
              </p>
              {product.description.length > 80 && (
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                  className="text-[11px] text-primary font-semibold hover:underline mt-0.5 touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {descExpanded ? "Згорнути" : "Розгорнути"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sizes + Colors */}
        <div className="flex flex-col gap-3 min-h-[40px]">
          {sizes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selectedSize === size}
                  aria-label={`Розмір ${size}`}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(selectedSize === size ? null : size); }}
                  className={`min-w-[44px] h-10 text-[11px] font-semibold px-3 py-2 rounded-lg border transition-all duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                    selectedSize === size
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {colorDots.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                aria-pressed={hasVariants && displayVariantId === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!hasVariants) return;
                  setActiveVariantId(c.id === activeVariantId ? null : c.id);
                }}
                onMouseEnter={() => hasVariants && setHoveredVariantId(c.id)}
                onMouseLeave={() => setHoveredVariantId(null)}
                className={`w-8 h-8 rounded-full shrink-0 touch-manipulation transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${c.border ? "ring-1 ring-border" : ""} ${
                  hasVariants && displayVariantId === c.id ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons — always visible (card click auto-selects middle size) */}
        <div
          className={`grid grid-cols-1 gap-2 overflow-hidden transition-all duration-200 ease-out ${
            actionsVisible ? "max-h-28 opacity-100 mt-1" : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={handleAddPrint}
            disabled={isOutOfStock}
            className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <ToolCase className="mr-2 inline size-5 align-[-5px]" />
            Додати принт
          </button>
          <button
            type="button"
            onClick={handleAddWithoutPrint}
            disabled={isOutOfStock}
            className="w-full py-2.5 rounded-full border border-border bg-background text-foreground text-xs font-bold hover:border-foreground/40 hover:bg-muted active:scale-[0.98] transition-all duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <CircleSlash className="mr-2 inline size-5 align-[-5px]" />
            Без принту
          </button>
        </div>
      </div>
    </div>
  );
}

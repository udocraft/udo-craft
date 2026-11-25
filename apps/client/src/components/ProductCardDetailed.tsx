"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizedField } from "@/lib/localized-field";
import { Plus } from "lucide-react";
import type { Product, ProductColorVariant, Material } from "@udo-craft/shared";
import { resolveProductImages, getAllImages } from "@udo-craft/shared/product-images";
import { NEUTRAL_SWATCH, isLightSwatch } from "@/lib/canvas-colors";

interface ProductCardDetailedProps {
  product: Product;
  colorVariants?: ProductColorVariant[];
  materials?: Material[];
  imagePriority?: boolean;
  onCustomize?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
  onAddWithoutPrint?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
}

const MAX_SWATCHES = 6;

function pickMiddleSize(sizes: string[]): string | null {
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : null;
}

/**
 * Product card with no container: only the image sits on a surface.
 * Name, price and swatches live on the page. The name is a stretched link over
 * the whole card; swatches and quick actions sit above it (z-10), never inside it.
 */
export function ProductCardDetailed({
  product, colorVariants, materials, imagePriority = false, onCustomize, onAddWithoutPrint,
}: ProductCardDetailedProps) {
  const t = useTranslations("collections");
  const locale = useLocale();
  const router = useRouter();
  const productName = localizedField(product.name, product.name_en, locale);
  const href = `/products/${product.slug || product.id}`;
  const isOutOfStock = !product.is_active;
  const variants = colorVariants ?? [];

  const [activeVariantId, setActiveVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [hoveredVariantId, setHoveredVariantId] = useState<string | null>(null);
  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;
  const shownVariant = variants.find((v) => v.id === (hoveredVariantId ?? activeVariantId)) ?? null;

  // Product images, else the shown colour's images (many products only have variant images).
  const images = useMemo(() => {
    const own = resolveProductImages(product.product_images, product.images);
    const variantImgs = shownVariant ? resolveProductImages(shownVariant.variant_images, shownVariant.images) : [];
    return Object.values(getAllImages(variantImgs.length ? variantImgs : own)).filter(Boolean);
  }, [product, shownVariant]);
  const primary = images[0] ?? "";
  const secondary = images[1] ?? "";

  const swatches = variants.map((v) => {
    const mat = materials?.find((m) => m.id === v.material_id);
    const hex = mat?.hex_code || NEUTRAL_SWATCH;
    return { id: v.id, name: mat?.name || "Standard", hex, light: isLightSwatch(hex) };
  });

  const sizes = product.available_sizes || [];
  const sizeRange = sizes.length > 1 ? `${sizes[0]}–${sizes[sizes.length - 1]}` : sizes[0] ?? "";
  const priceLabel = product.base_price_cents > 0
    ? t("fromPrice", { price: (product.base_price_cents / 100).toFixed(0) })
    : t("priceOnRequest");
  const activeColor = activeVariant ? materials?.find((m) => m.id === activeVariant.material_id)?.name ?? null : null;

  const go = (mode: "customize" | "add") => {
    if (isOutOfStock) return;
    const size = pickMiddleSize(sizes);
    if (mode === "customize" && onCustomize) return onCustomize(product, size, activeColor, activeVariant);
    if (mode === "add" && onAddWithoutPrint) return onAddWithoutPrint(product, size, activeColor, activeVariant);
    const params = new URLSearchParams({ product: product.slug || product.id, [mode === "customize" ? "customize" : "add"]: "1" });
    if (size) params.set("size", size);
    if (activeColor) params.set("color", activeColor);
    if (activeVariant?.id) params.set("variant", activeVariant.id);
    router.push(`/order?${params.toString()}`);
  };

  return (
    <article className={`group/card relative flex h-full flex-col ${isOutOfStock ? "pointer-events-none opacity-60" : ""}`}>
      {/* Media: the only surface in the card */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-muted">
        {primary ? (
          <>
            <Image
              src={primary}
              alt=""
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"
              priority={imagePriority}
              className={`object-contain p-[8%] transition-[opacity,transform] duration-500 ease-out group-hover/card:scale-[1.03] ${secondary ? "group-hover/card:opacity-0" : ""}`}
            />
            {secondary && (
              <Image
                src={secondary}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-contain p-[8%] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
              />
            )}
          </>
        ) : (
          <span className="absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted-foreground">{productName}</span>
        )}

        {/* Quick actions: on hover/focus with a pointer, always visible on touch */}
        {!isOutOfStock && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2 transition-opacity duration-fast [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100">
            <button
              type="button"
              onClick={() => go("customize")}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("addPrint")}
            </button>
            <button
              type="button"
              onClick={() => go("add")}
              className="hidden min-h-11 items-center justify-center rounded-full bg-background/90 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:inline-flex"
            >
              {t("withoutPrint")}
            </button>
          </div>
        )}
      </div>

      {/* Details: no container */}
      <div className="flex flex-col gap-2 pt-3">
        {swatches.length > 0 && (
          <div className="relative z-10 flex items-center gap-1.5" role="group" aria-label={productName}>
            {swatches.slice(0, MAX_SWATCHES).map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                aria-pressed={activeVariantId === c.id}
                title={c.name}
                onClick={() => setActiveVariantId(c.id)}
                onMouseEnter={() => setHoveredVariantId(c.id)}
                onMouseLeave={() => setHoveredVariantId(null)}
                onFocus={() => setHoveredVariantId(c.id)}
                onBlur={() => setHoveredVariantId(null)}
                className={`hit-44 size-4 shrink-0 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  c.light ? "ring-1 ring-inset ring-border" : ""
                } ${activeVariantId === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {swatches.length > MAX_SWATCHES && (
              <span className="text-xs text-muted-foreground">+{swatches.length - MAX_SWATCHES}</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          {/* Stretched link: the whole card opens the product. */}
          <Link
            href={href}
            aria-disabled={isOutOfStock || undefined}
            tabIndex={isOutOfStock ? -1 : undefined}
            className="min-w-0 text-base font-medium leading-snug text-foreground [overflow-wrap:anywhere] outline-none after:absolute after:inset-0 after:rounded-card hover:underline hover:underline-offset-4 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-offset-2"
          >
            {productName}
          </Link>
          <p className="shrink-0 whitespace-nowrap text-base tabular-nums text-foreground">{priceLabel}</p>
        </div>

        {sizeRange && <p className="text-sm text-muted-foreground">{sizeRange}</p>}
      </div>
    </article>
  );
}

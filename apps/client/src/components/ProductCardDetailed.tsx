"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { Plus } from "lucide-react";
import { Product, ProductColorVariant, Material, resolveProductImages, getAllImages } from "@udo-craft/shared";

interface ProductCardDetailedProps {
  product: Product;
  colorVariants?: ProductColorVariant[];
  materials?: Material[];
  imagePriority?: boolean;
  /** Dense grid: smaller type, fewer swatches. */
  compact?: boolean;
  onCustomize?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
  onAddWithoutPrint?: (product: Product, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
}

function pickMiddleSize(sizes: string[]): string | null {
  return sizes.length ? sizes[Math.floor(sizes.length / 2)] : null;
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 225;
}

/**
 * Product card without a container: only the image sits on a surface.
 * Name, price and swatches live on the page. The image and name are links;
 * swatches and actions are siblings, never nested inside the link.
 */
export function ProductCardDetailed({
  product, colorVariants, materials, imagePriority = false, compact = false, onCustomize, onAddWithoutPrint,
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
  const displayVariant = variants.find((v) => v.id === (hoveredVariantId ?? activeVariantId)) ?? null;
  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;

  const images = useMemo(() => {
    const productImgs = resolveProductImages((product as any).product_images, product.images);
    const variantImgs = displayVariant ? resolveProductImages((displayVariant as any).variant_images, displayVariant.images) : null;
    return Object.values(getAllImages(variantImgs?.length ? variantImgs : productImgs)).filter(Boolean);
  }, [product, displayVariant]);
  const primary = images[0] ?? "";
  const secondary = images[1] ?? "";

  const swatches = variants.map((v) => {
    const mat = materials?.find((m) => m.id === v.material_id);
    const hex = mat?.hex_code || "#cccccc";
    return { id: v.id, name: mat?.name || "Standard", hex };
  });
  const maxSwatches = compact ? 5 : 7;

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
    <article className={`group/card flex h-full flex-col ${isOutOfStock ? "opacity-60" : ""}`}>
      {/* Media: the only surface in the card */}
      <div className="relative">
        <Link
          href={href}
          aria-label={productName}
          tabIndex={-1}
          className="relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted"
        >
          {primary ? (
            <>
              <Image
                src={primary}
                alt=""
                fill
                sizes={compact
                  ? "(min-width: 1280px) 17vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                  : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"}
                priority={imagePriority}
                className={`object-contain p-[8%] transition-[opacity,transform] duration-500 ease-[var(--ease-out-strong)] group-hover/card:scale-[1.03] ${secondary ? "group-hover/card:opacity-0" : ""}`}
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
            <span className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{productName}</span>
          )}
        </Link>

        {/* Quick action: appears on hover (pointer) and always on touch */}
        {!isOutOfStock && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex gap-2 opacity-100 transition-opacity duration-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100 [@media(hover:hover)]:group-focus-within/card:opacity-100">
            <button
              type="button"
              onClick={() => go("customize")}
              className="pointer-events-auto inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-lg transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("addPrint")}
            </button>
            {!compact && <button
              type="button"
              onClick={() => go("add")}
              className="pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full bg-background/90 px-4 text-sm font-medium text-foreground shadow-lg backdrop-blur transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("withoutPrint")}
            </button>}
          </div>
        )}
      </div>

      {/* Details: no container */}
      <div className="flex flex-col gap-2 pt-3">
        {swatches.length > 0 && (
          <div className="flex items-center gap-1.5" role="group" aria-label={productName}>
            {swatches.slice(0, maxSwatches).map((c) => (
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
                  isLight(c.hex) ? "ring-1 ring-inset ring-border" : ""
                } ${activeVariantId === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            {swatches.length > maxSwatches && (
              <span className="text-xs text-muted-foreground">+{swatches.length - maxSwatches}</span>
            )}
          </div>
        )}

        <div className={compact ? "flex flex-col gap-0.5" : "flex items-baseline justify-between gap-3"}>
          <Link
            href={href}
            className={`min-w-0 font-medium leading-snug text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:underline ${compact ? "text-sm" : "text-base"}`}
          >
            <span className="line-clamp-2">{productName}</span>
          </Link>
          <p className={`shrink-0 tabular-nums ${compact ? "text-sm text-muted-foreground" : "text-base text-foreground"}`}>{priceLabel}</p>
        </div>

        {sizeRange && (
          <p className="text-xs text-muted-foreground">
            {sizeRange}{swatches.length > 1 ? ` · ${swatches.length} ${locale === "uk" ? "кольорів" : "colours"}` : ""}
          </p>
        )}
      </div>
    </article>
  );
}

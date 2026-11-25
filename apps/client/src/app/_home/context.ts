import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import type { Material, Product, ProductColorVariant } from "@udo-craft/shared";

export interface HomeCategory {
  id: string;
  name: string;
  name_en?: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  image_url?: string | null;
}

export interface HomeProduct extends Product {
  category_id?: string | null;
}

export type CmsMap = Record<string, Record<string, unknown>>;

export interface HomeCtx {
  locale: string;
  products: HomeProduct[];
  categories: HomeCategory[];
  materials: Material[];
  colorVariants: ProductColorVariant[];
  cms: CmsMap;
}

/**
 * CMS copy is authored in Ukrainian only, so other locales keep their
 * translations. Returns the CMS value on `uk` when it is filled in.
 */
export function cmsText(ctx: Pick<HomeCtx, "locale" | "cms">, slug: string, key: string, fallback: string): string {
  if (ctx.locale !== "uk") return fallback;
  const value = ctx.cms[slug]?.[key];
  return typeof value === "string" && value ? value : fallback;
}

/** Same as cmsText but with no locale gate (settings such as URLs, phone, email). */
export function cmsValue(ctx: Pick<HomeCtx, "cms">, slug: string, key: string, fallback: string): string {
  const value = ctx.cms[slug]?.[key];
  return typeof value === "string" && value ? value : fallback;
}

/** Attributes that let the admin live-preview bridge patch this text node. */
export function cmsAttrs(ctx: Pick<HomeCtx, "locale">, slug: string, key: string) {
  return ctx.locale === "uk" ? ({ "data-cms": `${slug}.${key}` } as const) : ({} as const);
}

/**
 * Active products with a cover image: the product's own front image, else the
 * first colour variant's (many products only have variant images).
 */
export function coverImages(ctx: Pick<HomeCtx, "products" | "colorVariants">, limit: number) {
  const pick = (m: Record<string, string>) => m.front ?? Object.values(m)[0] ?? "";
  const out: { product: HomeProduct; image: string }[] = [];
  for (const p of ctx.products) {
    if (!p.is_active) continue;
    let image = pick(getAllImages(resolveProductImages(p.product_images, p.images)));
    if (!image) {
      const v = ctx.colorVariants.find((cv) => cv.product_id === p.id);
      if (v) image = pick(getAllImages(resolveProductImages(v.variant_images, v.images)));
    }
    if (image) out.push({ product: p, image });
    if (out.length >= limit) break;
  }
  return out;
}

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

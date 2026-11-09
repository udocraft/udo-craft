import type { APIRequestContext } from "@playwright/test";

export const VIEWPORTS = [
  { name: "375", width: 375, height: 812 },
  { name: "1280", width: 1280, height: 800 },
] as const;

/** Route per page under test. English has no locale prefix (localePrefix: as-needed). */
export const STATIC_PAGES = [
  { name: "home /en", path: "/" },
  { name: "home /uk", path: "/uk" },
  { name: "home /de", path: "/de" },
  { name: "privacy", path: "/privacy" },
] as const;

/** First active product slug, or E2E_PRODUCT_SLUG. Null when the catalog is empty. */
export async function productPath(request: APIRequestContext): Promise<string | null> {
  const fixed = process.env.E2E_PRODUCT_SLUG;
  if (fixed) return `/products/${fixed}`;
  const res = await request.get("/api/products?active=true");
  if (!res.ok()) return null;
  const list = (await res.json()) as { slug?: string }[];
  const slug = list.find((p) => p.slug)?.slug;
  return slug ? `/products/${slug}` : null;
}

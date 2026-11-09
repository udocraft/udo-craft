import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";
import { createServiceClient } from "@/lib/supabase/service";
import { languageAlternates, localizedUrl } from "@/lib/seo";

// Product list comes from Supabase; refresh hourly.
export const revalidate = 3600;

/** Public, indexable routes. /cabinet, /checkout and /api are intentionally absent. */
const STATIC_ROUTES: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/order", changeFrequency: "weekly", priority: 0.8 },
  { path: "/popup", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

async function activeProducts(): Promise<{ slug: string; updated_at: string | null }[]> {
  try {
    const { data, error } = await createServiceClient()
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true);
    if (error) throw error;
    return (data ?? []).filter((p): p is { slug: string; updated_at: string | null } => Boolean(p.slug));
  } catch (err) {
    // A catalog outage must not take the sitemap down; static pages still list.
    console.error("sitemap: could not load products", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of STATIC_ROUTES) {
    const languages = languageAlternates(route.path);
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(locale, route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: { languages },
      });
    }
  }

  for (const product of await activeProducts()) {
    const path = `/products/${product.slug}`;
    const languages = languageAlternates(path);
    const lastModified = product.updated_at ? new Date(product.updated_at) : now;
    for (const locale of locales) {
      entries.push({
        url: localizedUrl(locale, path),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: { languages },
      });
    }
  }

  return entries;
}

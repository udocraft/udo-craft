import { createServiceClient } from "@/lib/supabase/service";
import type { Material, ProductColorVariant } from "@udo-craft/shared";
import type { CmsMap, HomeCategory, HomeCtx, HomeProduct } from "./context";

// What src/app/_home/* and ProductCardDetailed read. Keep in sync with them.
// Materials and variants are narrowed in SQL. Products and categories are read
// with "*" on purpose: name_en / description_en come from a migration that may not
// be applied everywhere, and naming a missing column would blank the whole catalog.
// Instead only these fields are kept, so the rest never reaches the browser payload.
const MATERIAL_COLUMNS = "id, name, hex_code, is_active, sort_order";
const VARIANT_COLUMNS = "id, product_id, material_id, images, variant_images, sort_order, is_active";
const PRODUCT_FIELDS = [
  "id", "slug", "name", "name_en", "description", "description_en", "base_price_cents",
  "images", "product_images", "available_sizes", "is_active", "category_id",
] as const;
const CATEGORY_FIELDS = ["id", "slug", "name", "name_en", "sort_order", "is_active"] as const;

function pick<T extends object>(rows: T[] | null, fields: readonly string[]): Record<string, unknown>[] {
  return (rows ?? []).map((row) =>
    Object.fromEntries(fields.filter((f) => f in row).map((f) => [f, (row as Record<string, unknown>)[f]])),
  );
}

const EMPTY = (locale: string): HomeCtx => ({ locale, products: [], categories: [], materials: [], colorVariants: [], cms: {} });

/**
 * Catalog + published CMS for the home page and /biz. Never throws for data errors
 * (the page still renders), but rethrows Next's dynamic-usage signal.
 */
export async function loadHomeData(locale: string): Promise<HomeCtx> {
  try {
    const service = createServiceClient();
    const [prodRes, catRes, matRes, varRes, cmsRes] = await Promise.all([
      service.from("products").select("*").eq("is_active", true).order("created_at", { ascending: true }),
      service.from("categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("materials").select(MATERIAL_COLUMNS).eq("is_active", true),
      service.from("product_color_variants").select(VARIANT_COLUMNS).eq("is_active", true).order("sort_order", { ascending: true }),
      service.from("cms_published").select("slug, body").eq("is_active", true),
    ]);

    // Not fatal, but with ISR a failed query is cached until the next revalidation,
    // so make it visible in the logs instead of silently showing an empty catalog.
    for (const [name, res] of Object.entries({ products: prodRes, categories: catRes, materials: matRes, variants: varRes, cms: cmsRes })) {
      if (res.error) console.error(`home data: ${name} query failed:`, res.error.message);
    }

    const cms = (cmsRes.data || []).reduce((acc, item) => {
      acc[item.slug as string] = (item.body as Record<string, unknown>) || {};
      return acc;
    }, {} as CmsMap);

    return {
      locale,
      products: pick(prodRes.data, PRODUCT_FIELDS) as unknown as HomeProduct[],
      categories: pick(catRes.data, CATEGORY_FIELDS) as unknown as HomeCategory[],
      materials: (matRes.data || []) as unknown as Material[],
      colorVariants: (varRes.data || []) as unknown as ProductColorVariant[],
      cms,
    };
  } catch (err: unknown) {
    const e = err as { digest?: string; message?: string };
    if (e?.digest === "DYNAMIC_SERVER_USAGE" || e?.message?.includes("DYNAMIC_SERVER_USAGE")) throw err;
    console.error("Error fetching home page data:", err);
    return EMPTY(locale);
  }
}

/** Organization JSON-LD shared by home and /biz. */
export function organizationJsonLd(siteUrl: string, description: string, cms: CmsMap) {
  const contact = cms.home_contact ?? {};
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "U:DO CRAFT",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description,
    sameAs: [
      (contact.instagram as string) ?? "https://www.instagram.com/u.do.craft/",
      (contact.telegram as string) ?? "https://t.me/udostore",
    ],
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

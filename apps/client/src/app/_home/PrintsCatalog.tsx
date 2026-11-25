import { getTranslations } from "next-intl/server";
import { Section, SectionHeader } from "@udo-craft/ui";
import { createServiceClient } from "@/lib/supabase/service";
import { PrintsCatalogGrid, type CatalogPrint } from "./PrintsCatalogGrid";

interface PricingRow {
  print_type: string;
  size_label: string;
  size_min_cm: number;
  size_max_cm: number;
  qty_tiers: { min_qty: number; price_cents: number }[] | null;
}

/**
 * Prints uploaded in admin (Принти → Бібліотека), grouped by their category like the
 * product catalogue. Presets have no sizes or prices of their own: every print can be
 * made with any active print type, so each card shows the active types, their size
 * range and the lowest price from the shared price grid. Hidden when there are no prints.
 */
export async function PrintsCatalog({ locale }: { locale: string }) {
  const service = createServiceClient();
  const [presetsRes, pricingRes, typesRes] = await Promise.all([
    service.from("print_presets").select("id,name,category,thumbnail_url,file_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
    service.from("print_type_pricing").select("print_type,size_label,size_min_cm,size_max_cm,qty_tiers").eq("is_active", true),
    service.from("print_types").select("id,label,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);
  // Missing table or any error: no section rather than a broken page.
  if (presetsRes.error || !presetsRes.data?.length) return null;

  const rows = (pricingRes.data ?? []) as PricingRow[];
  const types = (typesRes.data ?? []).filter((t) => rows.some((r) => r.print_type === t.id)).map((t) => t.label as string);
  // One overall range reads better than a list of overlapping size labels.
  const mins = rows.map((r) => Number(r.size_min_cm)).filter((n) => n > 0);
  const maxs = rows.map((r) => Number(r.size_max_cm)).filter((n) => n > 0);
  const sizes = mins.length && maxs.length ? [`${Math.min(...mins)}–${Math.max(...maxs)} см`] : [];
  const prices = rows.flatMap((r) => (r.qty_tiers ?? []).map((t) => t.price_cents)).filter((c) => c > 0);
  const fromCents = prices.length ? Math.min(...prices) : null;

  const prints: CatalogPrint[] = presetsRes.data.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    category: ((p.category as string | null) ?? "").trim(),
    image: (p.thumbnail_url as string | null) || (p.file_url as string),
  }));

  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: "homePrints" }),
    getTranslations({ locale, namespace: "collections" }),
  ]);
  return (
    <Section id="prints" aria-labelledby="prints-heading">
      <SectionHeader titleId="prints-heading" title={t("heading")} lede={t("lede")} />
      <PrintsCatalogGrid
        prints={prints}
        types={types}
        sizes={sizes}
        labels={{
          heading: t("heading"),
          sizes: t("sizes"),
          types: t("types"),
          from: fromCents !== null ? t("from", { price: Math.round(fromCents / 100) }) : null,
          add: t("add"),
          all: tc("all"),
          prevPage: tc("prevPage"),
          nextPage: tc("nextPage"),
          page: tc("page", { n: "{n}" }),
        }}
      />
    </Section>
  );
}

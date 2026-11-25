import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { jsonLdHtml, localizedUrl, pageMetadata } from "@/lib/seo";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, Clock3, ShieldCheck, Star } from "lucide-react";
import { Section } from "@udo-craft/ui";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { normalizeProductMarketingMeta, type Material, type Product, type ProductColorVariant } from "@udo-craft/shared";
import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { FooterSection } from "@/app/_sections/FooterSection";
import type { ProductWithMeta } from "./_types";
import { ProductPurchase, type PurchaseColor } from "./_components/ProductPurchase";
import { DetailRow, FeatureGrid, GuideLink, RichText, iconFor } from "./_details";
import { MaterialSection } from "./_material";
import { SectionNav } from "./_section-nav";
import { SizeTable, type SizeChartData } from "./_size-table";

// Product pages are ISR: rebuilt in the background at most every 5 minutes.
export const revalidate = 300;
// Nothing is prerendered at build (the catalog lives in Supabase); an empty list makes Next
// render each slug on first request and then serve it from the ISR cache.
// Do not add a segment-level not-found.tsx here: together with notFound() it makes Next 14
// discard the rendered HTML and serve every request dynamically (no-store). The locale-level
// not-found.tsx handles unknown slugs.
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// One query per render, shared by generateMetadata and the page.
const getActiveProducts = cache(async () => {
  const { data } = await createServiceClient()
    .from("products")
    .select("*, discount_grid, category_id, size_chart_id, marketing_meta")
    .eq("is_active", true);
  return (data ?? []) as ProductWithMeta[];
});

/** One-line plain-text summary for meta description: markup stripped, trimmed to ~160 chars. */
function summarize(text: string, max = 160): string {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length <= max ? plain : `${plain.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const [t, prodList] = await Promise.all([getTranslations({ locale, namespace: "meta" }), getActiveProducts()]);
  const prod = prodList.find((p) => p.slug === slug || p.id === slug);

  if (!prod) {
    return { title: t("productNotFound"), robots: { index: false, follow: false } };
  }

  const name = localizedField(prod.name, prod.name_en, locale);
  const min = normalizeProductMarketingMeta(prod.marketing_meta).min_order_qty;
  const own = summarize(localizedField(prod.description ?? "", prod.description_en, locale));
  const imgs = resolveProductImages((prod as any).product_images, prod.images as Record<string, string>);
  const imageMap = getAllImages(imgs);

  return pageMetadata({
    locale,
    path: `/products/${prod.slug || prod.id}`,
    title: t("productTitle", { name }),
    description: own || t("productDescription", { name, min }),
    image: imageMap.front || Object.values(imageMap)[0] || undefined,
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const supabase = createServiceClient();

  const [prodList, { data: vars }, { data: mats }] = await Promise.all([
    getActiveProducts(),
    supabase.from("product_color_variants").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("materials").select("*").eq("is_active", true),
  ]);

  const prod = prodList.find((p) => p.slug === slug || p.id === slug);

  if (!prod) {
    notFound();
  }

  const prodVariants = ((vars ?? []) as ProductColorVariant[]).filter((v) => v.product_id === prod.id);
  const allVariants = (vars ?? []) as ProductColorVariant[];
  const materialsList = (mats ?? []) as Material[];

  const [tFooter, tHome, tNav] = await Promise.all([
    getTranslations({ locale, namespace: "footer" }),
    getTranslations({ locale, namespace: "home" }),
    getTranslations({ locale, namespace: "nav" }),
  ]);
  const name = localizedField(prod.name, prod.name_en, locale);
  const meta = normalizeProductMarketingMeta(prod.marketing_meta);

  const productImgs = resolveProductImages(prod.product_images, prod.images as Record<string, string>);
  const colors: PurchaseColor[] = prodVariants.map((v) => {
    const mat = materialsList.find((m) => m.id === v.material_id);
    const own = resolveProductImages(v.variant_images, v.images);
    return { id: v.id, name: mat?.name ?? "—", hex: mat?.hex_code ?? "transparent", images: getAllImages(own.length ? own : productImgs) };
  });

  // Size chart rendered inline in "Розміри" (the buy column keeps the modal for quick lookup).
  let sizeChart: SizeChartData | null = null;
  if (prod.size_chart_id) {
    const { data: chart } = await supabase.from("size_charts").select("name, rows").eq("id", prod.size_chart_id).maybeSingle();
    if (chart && Array.isArray(chart.rows) && chart.rows.length > 0) sizeChart = { name: chart.name, rows: chart.rows as Record<string, string>[] };
  }

  const similar = prodList.filter((p) => p.id !== prod.id && p.category_id === prod.category_id && p.is_active).slice(0, 4);

  const description =
    localizedField(prod.description ?? "", prod.description_en, locale) ||
    `${name} для корпоративного мерчу, брендованих подій і командного одягу.`;
  const productUrl = localizedUrl(locale, `/products/${prod.slug || prod.id}`);
  const allImages = Object.values(getAllImages(productImgs));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description: summarize(description, 300),
      url: productUrl,
      sku: prod.slug || prod.id,
      brand: { "@type": "Brand", name: "U:DO CRAFT" },
      ...(allImages.length ? { image: allImages } : {}),
      // Priced products only: "from 0" is not a real offer and fails Rich Results.
      ...((prod.base_price_cents ?? 0) > 0
        ? {
            offers: {
              "@type": "Offer",
              url: productUrl,
              priceCurrency: "UAH",
              price: Math.round(prod.base_price_cents / 100),
              availability: "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "U:DO CRAFT", item: localizedUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name, item: productUrl },
      ],
    },
  ];
  // Lead time is only shown when the data has it (some products carry 0/0).
  const leadMin = meta.delivery_min_days;
  const leadMax = meta.delivery_max_days;
  const leadLabel = leadMax > 0 ? (leadMin > 0 && leadMin < leadMax ? `${leadMin}–${leadMax} дн.` : `${leadMax} дн.`) : null;
  // The normalized defaults (4.8 / 128) are placeholders: only the raw values count as a rating.
  const rawMeta = prod.marketing_meta;
  const hasRating = (rawMeta?.rating_avg ?? 0) > 0 && (rawMeta?.rating_count ?? 0) > 0;

  const groups = meta.feature_groups ?? [];
  const isMaterial = (title: string) => /матеріал|material|тканин/i.test(title);
  const materialGroup = groups.find((g) => isMaterial(g.title));
  const specGroups = groups.filter((g) => g !== materialGroup).slice(0, 3);
  const materialProps = (materialGroup?.items ?? []).slice(0, 5).map((i) => ({ icon: iconFor(i.title), label: i.title }));
  const materialBody = (materialGroup?.items ?? [])
    .map((i) => i.description?.trim())
    .filter((d): d is string => !!d)
    .map((d) => (/[.!?]$/.test(d) ? d : `${d}.`))
    .join(" ");
  const materialImage = Object.values(colors.find((c) => Object.keys(c.images).length > 1)?.images ?? {})[1] ?? Object.values(getAllImages(productImgs))[1] ?? colors[0]?.images.front;
  const hasMaterial = !!materialGroup && (materialProps.length > 0 || !!materialBody);
  const hasSpecs = !!description.trim() || specGroups.length > 0;
  const hasFiles = !!meta.file_guidelines?.trim();
  const hasDelivery = !!meta.delivery_note?.trim() || !!leadLabel;

  const navItems = [
    hasSpecs && { id: "specs", label: "Характеристики" },
    hasMaterial && { id: "material", label: "Матеріал" },
    !!sizeChart && { id: "sizes", label: "Розміри" },
    hasDelivery && { id: "delivery", label: "Доставка" },
    hasFiles && { id: "files", label: "Файли" },
    similar.length > 0 && { id: "similar", label: "Схожі товари" },
  ].filter((i): i is { id: string; label: string } => !!i);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <SiteHeader />

      <main id="main" className="flex-1 pt-14 lg:pt-24">
        <ProductPurchase
          productId={prod.id}
          slug={prod.slug}
          name={name}
          basePriceCents={prod.base_price_cents ?? 0}
          sizes={prod.available_sizes ?? []}
          sizeChartId={prod.size_chart_id ?? null}
          discountGrid={prod.discount_grid ?? []}
          minOrderQty={meta.min_order_qty}
          promoNote={meta.promo_note}
          guideUrl={meta.guide_url || "/biz#contact"}
          colors={colors}
          defaultImages={getAllImages(productImgs)}
          leadLabel={leadLabel}
        >
          <nav className="mb-6 hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex" aria-label="Breadcrumb">
            <Link href="/" className="inline-flex min-h-6 items-center hover:text-foreground">Головна</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#catalog" className="inline-flex min-h-6 items-center hover:text-foreground">Каталог</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate font-medium text-foreground" aria-current="page">{name}</span>
          </nav>
          <h1 className="text-h1 font-medium text-balance">{name}</h1>
          {hasRating && (
            <p className="mt-3 flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-current" aria-hidden="true" />
              <span className="font-semibold">{rawMeta?.rating_avg}</span>
              <span className="text-muted-foreground">· {rawMeta?.rating_count} відгуків</span>
            </p>
          )}
          <p className="mt-3 flex items-center gap-2 text-sm text-foreground/85">
            <span aria-hidden="true" className="size-2 rounded-full bg-success" /> Доступно під замовлення
          </p>
          {(meta.badges ?? []).length > 0 && (
            <ul className="mt-4 flex flex-wrap items-center gap-2">
              {(meta.badges ?? []).slice(0, 2).map((badge) => (
                <li key={badge.label} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="size-3" strokeWidth={1.8} aria-hidden="true" /> {badge.label}
                </li>
              ))}
            </ul>
          )}
        </ProductPurchase>

        <div className="mt-8 lg:mt-12">
          <SectionNav items={navItems} />

          {hasSpecs && (
            <DetailRow id="specs" title="Характеристики">
              <div className="space-y-12">
                {description.trim() && <RichText text={description} />}
                {specGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-6 text-eyebrow text-muted-foreground">{group.title}</h3>
                    <FeatureGrid items={group.items.map((i) => ({ icon: iconFor(i.title), title: i.title, description: i.description }))} />
                  </div>
                ))}
              </div>
            </DetailRow>
          )}

          {hasMaterial && (
            <MaterialSection id="material" eyebrow={name} title="Тканина, що тримає форму і принт" body={materialBody} imageUrl={materialImage} properties={materialProps} />
          )}

          {sizeChart && (
            <DetailRow id="sizes" title="Розміри">
              <SizeTable chart={sizeChart} />
            </DetailRow>
          )}

          {hasDelivery && (
            <DetailRow id="delivery" title="Доставка">
              <div className="space-y-8">
                {meta.delivery_note?.trim() && <RichText text={meta.delivery_note} />}
                <ul className="flex flex-wrap gap-x-10 gap-y-4 text-base font-medium">
                  {leadLabel && (
                    <li className="flex items-center gap-3"><Clock3 className="size-6" strokeWidth={1.4} aria-hidden="true" /> Виробництво {leadLabel}</li>
                  )}
                  <li className="flex items-center gap-3"><ShieldCheck className="size-6" strokeWidth={1.4} aria-hidden="true" /> Контроль якості</li>
                </ul>
              </div>
            </DetailRow>
          )}

          {hasFiles && (
            <DetailRow id="files" title="Файли для друку">
              <RichText text={meta.file_guidelines} />
              <GuideLink href={meta.guide_url || "/biz#contact"}>Перейти до консультації</GuideLink>
            </DetailRow>
          )}
        </div>

        <Section tone="inverse" className="py-12 md:py-12" aria-labelledby="bulk-cta-heading">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h2 id="bulk-cta-heading" className="text-h3 font-semibold">{tHome("biz.heading")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tHome("biz.text")}</p>
            </div>
            <Link href="/biz" className={buttonVariants({ variant: "inverse", size: "lg", className: "shrink-0" })}>
              {tNav("business")} <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Section>

        {similar.length > 0 && (
          <Section id="similar" aria-labelledby="similar-heading" className="scroll-mt-40">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <h2 id="similar-heading" className="text-h2 font-semibold">Схожі товари</h2>
                <p className="mt-1 text-sm text-muted-foreground">Вам також може сподобатись</p>
              </div>
              <Link href="/#catalog" className="hidden min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline sm:inline-flex">
                Весь каталог <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {similar.map((p) => (
                <li key={p.id}>
                  <ProductCardDetailed
                    product={p as unknown as Product}
                    colorVariants={allVariants.filter((v) => v.product_id === p.id)}
                    materials={materialsList}
                  />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>

      <FooterSection tagline={tFooter("tagline")} copyright={tFooter("copyright")} instagram="https://www.instagram.com/u.do.craft/" telegram="https://t.me/udostore" />
    </div>
  );
}

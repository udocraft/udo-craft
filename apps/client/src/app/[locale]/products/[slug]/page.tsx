import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { jsonLdHtml } from "@/lib/seo";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, BadgeCheck, Clock3, PackageCheck, Shield } from "lucide-react";
import { Container, Section } from "@udo-craft/ui";
import { buttonVariants } from "@udo-craft/ui/components/ui/button-variants";
import { normalizeProductMarketingMeta, DEFAULT_PRODUCT_FEATURE_GROUPS, type Material, type Product, type ProductColorVariant } from "@udo-craft/shared";
import { getAllImages, resolveProductImages } from "@udo-craft/shared/product-images";
import { Link } from "@/i18n/navigation";
import { localizedField } from "@/lib/localized-field";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { FooterSection } from "@/app/_sections/FooterSection";
import type { ProductWithMeta } from "./_types";
import { InfoTabs } from "./_components/InfoTabs";
import { ProductPurchase, type PurchaseColor } from "./_components/ProductPurchase";
import { RichText } from "./_components/RichText";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prodList = await getActiveProducts();
  const prod = prodList.find((p) => p.slug === slug || p.id === slug);

  if (!prod) {
    return { title: "Товар не знайдено | U:DO Craft" };
  }

  const imgs = resolveProductImages((prod as any).product_images, prod.images as Record<string, string>);
  const imageMap = getAllImages(imgs);
  const imageUrl = imageMap.front || Object.values(imageMap)[0] || "";

  return {
    title: `${prod.name} | Брендування та пошив | U:DO Craft`,
    description: prod.description || `Замовте корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою від 10 одиниць.`,
    openGraph: {
      title: `${prod.name} | Корпоративний одяг U:DO Craft`,
      description: prod.description || `Замовте корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою від 10 одиниць.`,
      images: [imageUrl],
      type: "website",
    },
  };
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

  const imgs = resolveProductImages((prod as any).product_images, prod.images as Record<string, string>);
  const imageMap = getAllImages(imgs);
  const imageUrl = imageMap.front || Object.values(imageMap)[0] || "";
  const marketing = prod.marketing_meta ?? {};

  // JSON-LD Microdata for Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: prod.name,
    image: imageUrl,
    description: prod.description || `Корпоративний одяг ${prod.name} з індивідуальним принтом або вишивкою.`,
    offers: {
      "@type": "Offer",
      url: `https://u-do-craft.store/products/${prod.slug || prod.id}`,
      priceCurrency: "UAH",
      price: Math.round((prod.base_price_cents || 0) / 100),
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      deliveryLeadTime: {
        "@type": "QuantitativeValue",
        minValue: marketing.delivery_min_days ?? 7,
        maxValue: marketing.delivery_max_days ?? 14,
        unitCode: "DAY",
      },
    },
  };

  const [tHero, tFooter] = await Promise.all([
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "footer" }),
  ]);
  const name = localizedField(prod.name, prod.name_en, locale);
  const meta = normalizeProductMarketingMeta(prod.marketing_meta);
  const maxDiscountPct = Math.max(0, ...(prod.discount_grid ?? []).map((t) => t.discount_pct));

  const productImgs = resolveProductImages(prod.product_images, prod.images as Record<string, string>);
  const colors: PurchaseColor[] = prodVariants.map((v) => {
    const mat = materialsList.find((m) => m.id === v.material_id);
    const own = resolveProductImages(v.variant_images, v.images);
    return { id: v.id, name: mat?.name ?? "—", hex: mat?.hex_code ?? "transparent", images: getAllImages(own.length ? own : productImgs) };
  });

  const similar = prodList.filter((p) => p.id !== prod.id && p.category_id === prod.category_id && p.is_active).slice(0, 4);

  const description =
    localizedField(prod.description ?? "", prod.description_en, locale) ||
    `${name} для корпоративного мерчу, брендованих подій і командного одягу.`;
  const deliveryBadges = [
    { icon: Clock3, label: `${meta.delivery_min_days}–${meta.delivery_max_days} днів виробництво` },
    { icon: PackageCheck, label: `Від ${meta.min_order_qty} одиниць` },
    { icon: Shield, label: "Контроль якості" },
  ];

  const tabs = [
    { id: "description", label: "Опис", panel: <div className="max-w-4xl"><RichText text={description} /></div> },
    {
      id: "delivery",
      label: "Доставка",
      panel: (
        <div className="grid max-w-5xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <RichText text={meta.delivery_note || ""} />
          <ul className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
            {deliveryBadges.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 rounded-card border border-border bg-muted/40 p-4">
                <Icon className="size-5 text-primary" strokeWidth={1.7} aria-hidden="true" />
                <span className="text-sm font-semibold">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "files",
      label: "Інструкції щодо файлів",
      panel: (
        <div className="max-w-4xl">
          <RichText text={meta.file_guidelines || ""} />
          <Link href={meta.guide_url || "/#contact"} className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-primary hover:underline">
            Перейти до консультації <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />
      <SiteHeader />

      <main id="main" className="flex-1 pt-24">
        <Container className="pb-4">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="inline-flex min-h-6 items-center hover:text-foreground">Головна</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#catalog" className="inline-flex min-h-6 items-center hover:text-foreground">Каталог</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate font-medium text-foreground" aria-current="page">{name}</span>
          </nav>
        </Container>

        <Container className="pb-16">
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
            guideUrl={meta.guide_url || "/#contact"}
            colors={colors}
            defaultImages={getAllImages(productImgs)}
          >
            <h1 className="text-h1 font-semibold text-balance">{name}</h1>
            <ul className="mt-3 flex flex-wrap items-center gap-2">
              {(meta.badges ?? []).slice(0, 2).map((badge) => (
                <li key={badge.label} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <BadgeCheck className="size-3" strokeWidth={1.8} aria-hidden="true" /> {badge.label}
                </li>
              ))}
            </ul>
          </ProductPurchase>
        </Container>

        <Container className="pb-14">
          <InfoTabs label="Інформація про товар" tabs={tabs} />
        </Container>

        <section className="border-y border-border bg-muted/40" aria-label="Деталі товару">
          <Container className="py-12">
            <div className="grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-3">
              {(meta.feature_groups ?? DEFAULT_PRODUCT_FEATURE_GROUPS).slice(0, 3).map((group) => (
                <div key={group.title} className="bg-background p-5">
                  <h2 className="border-b border-border pb-3 text-eyebrow">{group.title}</h2>
                  <ul className="mt-4 space-y-3">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item.title}`} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                        <p className="text-sm font-semibold leading-snug">{item.title}</p>
                        {item.description && <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <Section tone="inverse" className="py-12 md:py-12" aria-labelledby="bulk-cta-heading">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div>
              <h2 id="bulk-cta-heading" className="text-h3 font-semibold">Потрібен корпоративний тираж?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Від {meta.min_order_qty} одиниць · {maxDiscountPct > 0 ? `Знижки до ${maxDiscountPct}% · ` : ""}{meta.delivery_min_days}–{meta.delivery_max_days} днів виробництво
              </p>
            </div>
            <Link href="/#contact" className={buttonVariants({ variant: "primary", size: "lg", className: "shrink-0" })}>
              Обговорити проєкт <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </Section>

        {similar.length > 0 && (
          <Section aria-labelledby="similar-heading">
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

      <FooterSection tagline={tHero("heading")} copyright={tFooter("copyright")} instagram="https://www.instagram.com/u.do.craft/" telegram="https://t.me/udostore" />
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { localizedField } from "@/lib/localized-field";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, Material, ProductColorVariant, ProductMarketingMeta } from "@udo-craft/shared";
import { getAllImages, normalizeProductMarketingMeta, resolveProductImages } from "@udo-craft/shared";
import {
  ArrowRight, Award, BadgeCheck, Check, ChevronDown, Clock3, Droplets, Layers3, Minus, PackageCheck, Plus,
  Leaf, Printer, Ruler, Scissors, Shield, ShieldCheck, Shirt, Sparkles, Star, Tags, Truck, Wind, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { ProductGallery } from "./_gallery";
import { MaterialSection } from "./_material";
import { DetailRow, FeatureGrid, GuideLink, RichText, SizeTable, type FeatureItem, type SizeChartData } from "./_details";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductWithMeta extends Omit<Product, "description" | "marketing_meta"> {
  description?: string;
  category_id?: string | null;
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
  marketing_meta?: ProductMarketingMeta;
}

export interface ProductDetailClientProps {
  product: ProductWithMeta;
  allProducts: ProductWithMeta[];
  variants: ProductColorVariant[];
  allVariants: ProductColorVariant[];
  materials: Material[];
  sizeChart?: SizeChartData | null;
}

const SESSION_KEY = "client-order-draft";

const ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck, layers: Layers3, package: PackageCheck, "package-check": PackageCheck,
  shirt: Shirt, award: Award, shield: Shield, "shield-check": ShieldCheck, truck: Truck, ruler: Ruler,
  tags: Tags, sparkles: Sparkles, zap: Zap, wind: Wind, droplets: Droplets,
};
const iconFor = (name?: string, fallback: LucideIcon = BadgeCheck) => (name && ICONS[name]) || fallback;

/** Pick a line icon from the feature title so admins don't have to set one per item. */
const KEYWORD_ICONS: Array<[RegExp, LucideIcon]> = [
  [/dtg|dtf|друк|print/i, Printer],
  [/вишив|embroid/i, Scissors],
  [/посад|крій|fit|розмір/i, Ruler],
  [/ткан|бавов|cotton|fabric|матеріал/i, Shirt],
  [/форм|стабіл|durab|міцн/i, ShieldCheck],
  [/макет|файл|перевір|check/i, BadgeCheck],
  [/відповідал|еко|sustain|responsib/i, Leaf],
  [/достав|ship|відправ/i, Truck],
];
const iconForTitle = (title: string, fallback: LucideIcon) => KEYWORD_ICONS.find(([re]) => re.test(title))?.[1] ?? fallback;

const SECTIONS = [
  { id: "details", label: "Характеристики" },
  { id: "material", label: "Матеріал" },
  { id: "sizes", label: "Розміри" },
  { id: "delivery", label: "Доставка" },
  { id: "files", label: "Файли" },
  { id: "similar", label: "Схожі товари" },
] as const;

function fmtPrice(cents: number) {
  return `₴${Math.round(cents / 100).toLocaleString("uk-UA")}`;
}

function getDiscount(grid: { qty: number; discount_pct: number }[] | undefined, qty: number) {
  if (!grid?.length) return 0;
  return [...grid].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty)?.discount_pct ?? 0;
}

function isLight(hex: string) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 225;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProductDetailClient({ product, allProducts, variants, allVariants, materials, sizeChart }: ProductDetailClientProps) {
  const router = useRouter();
  const tHero = useTranslations("hero");
  const tFooter = useTranslations("footer");
  const locale = useLocale();
  const productName = localizedField(product.name, product.name_en, locale);
  const description = localizedField(product.description ?? "", product.description_en, locale);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;
  const selectedMaterial = materials.find((m) => m.id === selectedVariant?.material_id) ?? null;

  const galleryImages = useMemo(() => {
    const pImgs = resolveProductImages((product as any).product_images, product.images as Record<string, string>);
    const vImgs = selectedVariant ? resolveProductImages((selectedVariant as any).variant_images, selectedVariant.images as Record<string, string>) : null;
    return Object.entries(getAllImages(vImgs?.length ? vImgs : pImgs))
      .filter(([, url]) => Boolean(url))
      .map(([key, url]) => ({ key, url }));
  }, [product, selectedVariant]);

  const swatches = variants.map((v) => {
    const mat = materials.find((m) => m.id === v.material_id);
    return { id: v.id, name: mat?.name ?? "—", hex: mat?.hex_code ?? "#cccccc" };
  });

  const sizes = product.available_sizes ?? [];
  const rawMeta = product.marketing_meta ?? {};
  const meta = normalizeProductMarketingMeta(product.marketing_meta);
  const discountTiers = [...(product.discount_grid ?? [])].sort((a, b) => a.qty - b.qty);
  const discountPct = getDiscount(product.discount_grid, quantity);
  const unitCents = product.base_price_cents ?? 0;
  const discountedCents = Math.round(unitCents * (1 - discountPct / 100));
  const totalCents = discountedCents * quantity;
  const nextDiscount = discountTiers.find((tier) => quantity < tier.qty);
  const maxTier = discountTiers[discountTiers.length - 1];
  const bestUnitCents = maxTier ? Math.round(unitCents * (1 - maxTier.discount_pct / 100)) : unitCents;
  const sliderMax = Math.max(100, meta.min_order_qty, quantity, maxTier?.qty ?? 0);
  const sliderMarks = Array.from(new Set([1, meta.min_order_qty, ...discountTiers.map((t) => t.qty), sliderMax])).sort((a, b) => a - b);

  // Ratings only when the admin entered them; never show defaults as if they were real.
  const hasRating = typeof rawMeta.rating_avg === "number" && typeof rawMeta.rating_count === "number" && rawMeta.rating_count > 0;

  // Lead time only when the admin set a real range.
  const leadTime = meta.delivery_max_days > 0
    ? `${Math.max(1, meta.delivery_min_days)}–${meta.delivery_max_days} днів`
    : null;

  const perks: { icon: LucideIcon; label: string }[] = [
    ...(leadTime ? [{ icon: Clock3, label: `${leadTime} виробництво` }] : []),
    ...meta.badges.slice(0, 3).map((b) => ({ icon: iconFor(b.icon), label: b.label })),
  ];

  const featureItems: FeatureItem[] = meta.feature_groups.flatMap((g) =>
    g.items.map((item) => ({ icon: iconForTitle(item.title, iconFor(g.icon, Shirt)), title: item.title, description: item.description })),
  );
  const materialGroup = meta.feature_groups.find((g) => g.icon === "shirt") ?? meta.feature_groups[1];
  const materialProps = [
    ...(materialGroup?.items ?? []).map((i, idx) => ({ icon: [Wind, Droplets, Shirt][idx % 3], label: i.title })),
    { icon: ShieldCheck, label: "Контроль якості" },
    { icon: Layers3, label: "Друк і вишивка" },
  ].slice(0, 5);
  const materialImage = galleryImages.find((i) => !["front", "back"].includes(i.key))?.url ?? galleryImages[1]?.url ?? galleryImages[0]?.url;

  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && p.category_id === product.category_id && p.is_active)
    .slice(0, 4);

  const resolvedSize = () => selectedSize ?? sizes[Math.floor(sizes.length / 2)] ?? "";

  const handleAddToCart = useCallback(() => {
    const cartItem = {
      productId: product.id, productName, productImage: galleryImages[0]?.url ?? "",
      productPrice: product.base_price_cents, unitPriceCents: discountedCents,
      printCostCents: 0, quantity, size: resolvedSize(), color: selectedMaterial?.name ?? "Стандарт", layers: [],
    };
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const draft = raw ? JSON.parse(raw) : { step: "select", contact: {}, cart: [] };
      draft.cart = [...(draft.cart ?? []), cartItem];
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event("udo_cart_update"));
    } catch { /* storage unavailable */ }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, productName, galleryImages, discountedCents, quantity, selectedSize, selectedMaterial, sizes]);

  const handleCustomize = useCallback(() => {
    const params = new URLSearchParams({ product: product.slug || product.id, customize: "1" });
    const size = resolvedSize();
    if (size) params.set("size", size);
    if (selectedMaterial?.name) params.set("color", selectedMaterial.name);
    if (selectedVariant?.id) params.set("variant", selectedVariant.id);
    router.push(`/order?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, selectedSize, selectedVariant, selectedMaterial, sizes, router]);

  const sectionsShown = SECTIONS.filter((s) => (s.id !== "sizes" || sizeChart) && (s.id !== "similar" || similarProducts.length > 0));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <SiteHeader />

      <main className="flex-1 pt-20">
        {/* ── Hero: gallery + buy column ──────────────────────────────── */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] xl:grid-cols-[minmax(0,1fr)_560px]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery images={galleryImages} alt={productName} resetKey={selectedVariantId ?? "base"} />
          </div>

          <div className="flex flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12 xl:px-14">
            <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1.5">
                <li><Link href="/" className="hover:text-foreground">Головна</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/#catalog" className="hover:text-foreground">Каталог</Link></li>
              </ol>
            </nav>

            <h1 className="text-[clamp(2.25rem,4.2vw,3.75rem)] font-medium leading-[1.02] tracking-[-0.035em] text-balance">
              {productName}
            </h1>

            <p className="mt-6 flex items-center gap-2.5 text-base text-foreground/80">
              <span aria-hidden="true" className="size-2.5 rounded-full bg-emerald-500" />
              В наявності · запуск після погодження макета
            </p>

            {/* Price + primary action on one line (reference 4) */}
            <div className="mt-8 flex items-center justify-between gap-6">
              <button
                type="button"
                onClick={handleCustomize}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-8 text-base font-medium text-background transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-none"
              >
                Додати принт <Plus className="size-5" aria-hidden="true" />
              </button>
              <div className="text-right">
                <p className="text-3xl font-medium tabular-nums tracking-[-0.02em] sm:text-4xl">{fmtPrice(discountedCents)}</p>
                {discountPct > 0 && (
                  <p className="text-sm text-muted-foreground"><s>{fmtPrice(unitCents)}</s> · −{discountPct}%</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddToCart}
              className="mt-3 inline-flex min-h-11 w-fit items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:underline"
              aria-live="polite"
            >
              {added ? <><Check className="size-4" aria-hidden="true" /> Додано до кошика</> : "або додати без принту"}
            </button>

            <hr className="my-8 border-border" />

            {maxTier && (
              <p className="text-base text-muted-foreground">
                Від {maxTier.qty} шт — <span className="font-semibold text-foreground">{fmtPrice(bestUnitCents)}</span> за одиницю ·{" "}
                <button type="button" onClick={() => setBulkOpen(true)} className="underline underline-offset-4 hover:text-foreground">
                  розрахувати тираж
                </button>
              </p>
            )}

            <ul className="mt-6 flex flex-col gap-4">
              {perks.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-4 text-lg">
                  <Icon className="size-7 shrink-0 text-foreground" strokeWidth={1.3} aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>

            {hasRating && (
              <p className="mt-6 flex items-center gap-3 text-base">
                <span className="flex text-primary" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="size-4" fill={i < Math.round(rawMeta.rating_avg!) ? "currentColor" : "none"} />
                  ))}
                </span>
                <span>{rawMeta.rating_avg!.toFixed(1)} / 5 ({rawMeta.rating_count} відгуків)</span>
              </p>
            )}

            <hr className="my-8 border-border" />

            {/* Colour */}
            {swatches.length > 0 && (
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Колір</p>
                  <p className="mt-1 text-lg font-medium">{selectedMaterial?.name ?? "—"}</p>
                </div>
                <div className="flex max-w-[60%] flex-wrap justify-end gap-2" role="group" aria-label="Колір">
                  {swatches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedVariantId(c.id)}
                      aria-label={c.name}
                      aria-pressed={selectedVariantId === c.id}
                      title={c.name}
                      className={`size-11 rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        isLight(c.hex) ? "ring-1 ring-inset ring-border" : ""
                      } ${selectedVariantId === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            {sizes.length > 0 && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Розмір {selectedSize && <span className="text-foreground">· {selectedSize}</span>}</p>
                  {sizeChart && (
                    <a href="#sizes" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:no-underline">Розмірна сітка</a>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5" role="group" aria-label="Розмір">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s === selectedSize ? null : s)}
                      aria-pressed={selectedSize === s}
                      className={`min-h-14 rounded-lg border text-sm font-medium tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        selectedSize === s ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + bulk calculator */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Кількість</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Зменшити кількість"
                  className="grid size-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <label className="sr-only" htmlFor="product-quantity">Кількість</label>
                <input
                  id="product-quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                  className="h-11 w-16 bg-transparent text-center text-lg font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                />
                <button type="button" onClick={() => setQuantity((q) => q + 1)} aria-label="Збільшити кількість"
                  className="grid size-11 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            {quantity > 1 && (
              <p className="mt-2 text-right text-sm text-muted-foreground">
                Разом <span className="font-medium text-foreground tabular-nums">{fmtPrice(totalCents)}</span>
              </p>
            )}

            <div className="mt-6 border-t border-border">
              <button
                type="button"
                onClick={() => setBulkOpen((v) => !v)}
                aria-expanded={bulkOpen}
                aria-controls="bulk-calculator"
                className="flex min-h-14 w-full items-center justify-between gap-3 text-left text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Калькулятор оптової ціни
                <ChevronDown className={`size-5 text-muted-foreground transition-transform ${bulkOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {bulkOpen && (
                  <motion.div
                    id="bulk-calculator"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 pb-6">
                      <p className="text-sm text-muted-foreground">{meta.promo_note}</p>
                      <input
                        type="range"
                        min={1}
                        max={sliderMax}
                        value={Math.min(quantity, sliderMax)}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="h-2 w-full cursor-pointer accent-foreground"
                        aria-label="Кількість товарів для оптової ціни"
                      />
                      <div className="flex flex-wrap gap-2">
                        {sliderMarks.map((mark) => (
                          <button key={mark} type="button" onClick={() => setQuantity(mark)}
                            aria-pressed={quantity === mark}
                            className={`min-h-11 rounded-full px-4 text-sm tabular-nums transition-colors ${quantity === mark ? "bg-foreground text-background" : "bg-muted hover:bg-muted/70"}`}>
                            {mark} шт
                          </button>
                        ))}
                      </div>
                      <dl className="grid grid-cols-2 gap-4 border-t border-border pt-5">
                        <div><dt className="text-sm text-muted-foreground">Ціна за одиницю</dt><dd className="text-2xl font-medium tabular-nums">{fmtPrice(discountedCents)}</dd></div>
                        <div className="text-right"><dt className="text-sm text-muted-foreground">Знижка</dt><dd className="text-2xl font-medium tabular-nums">{discountPct}%</dd></div>
                      </dl>
                      {nextDiscount && (
                        <p className="text-sm text-muted-foreground">
                          Ще {nextDiscount.qty - quantity} шт — і знижка {nextDiscount.discount_pct}%.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── In-page section nav (reference 7) ───────────────────────── */}
        <nav aria-label="Розділи товару" className="sticky top-20 z-20 border-y border-border bg-background/90 backdrop-blur-xl">
          <ul className="mx-auto flex max-w-[1440px] gap-8 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:px-10">
            {sectionsShown.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="inline-flex min-h-12 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <DetailRow id="details" title="Ключові характеристики">
            {description && <div className="mb-14"><RichText text={description} /></div>}
            <FeatureGrid items={featureItems} />
          </DetailRow>
        </div>

        <MaterialSection
          id="material"
          title="Матеріал, що тримає форму і бренд"
          body={materialGroup?.items.map((i) => i.description).filter(Boolean).join(". ") || "Щільна тканина, яка добре тримає друк і вишивку та залишається приємною після сотень прань."}
          imageUrl={materialImage}
          properties={materialProps}
        />

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          {sizeChart && (
            <DetailRow id="sizes" title="Розмірна сітка">
              <p className="mb-6 text-base text-muted-foreground">Усі виміри в таблиці стосуються самого виробу.</p>
              <SizeTable chart={sizeChart} />
            </DetailRow>
          )}

          <DetailRow id="delivery" title="Виробництво і доставка">
            <RichText text={meta.delivery_note} />
            <dl className="mt-10 grid gap-8 sm:grid-cols-3">
              {[
                { k: "Виробництво", v: leadTime ?? "Уточнюється" },
                { k: "Мінімальний тираж", v: `${meta.min_order_qty} шт` },
                { k: "Найкраща знижка", v: maxTier ? `−${maxTier.discount_pct}% від ${maxTier.qty} шт` : "За запитом" },
              ].map(({ k, v }) => (
                <div key={k} className="border-t border-border pt-4">
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-xl font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </DetailRow>

          <DetailRow id="files" title="Файли для друку">
            <RichText text={meta.file_guidelines} />
            <GuideLink href={meta.guide_url || "/#contact"}>Отримати консультацію по макету</GuideLink>
          </DetailRow>
        </div>

        {/* ── Corporate run CTA: full-bleed, no box ───────────────────── */}
        <section className="bg-foreground text-background">
          <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-4 py-20 sm:px-6 lg:flex-row lg:items-end lg:px-10">
            <div>
              <h2 className="max-w-2xl text-[clamp(2rem,4vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">Потрібен корпоративний тираж?</h2>
              <p className="mt-4 text-lg text-background/65">
                {[`Від ${meta.min_order_qty} шт`, maxTier ? `знижки до ${maxTier.discount_pct}%` : null, leadTime].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Link href="/#contact" className="inline-flex min-h-14 items-center gap-2 rounded-full bg-background px-8 text-base font-medium text-foreground transition-transform active:scale-[0.98]">
              Обговорити проєкт <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {similarProducts.length > 0 && (
          <section id="similar" aria-labelledby="similar-title" className="mx-auto max-w-[1440px] scroll-mt-32 px-4 py-20 sm:px-6 lg:px-10">
            <div className="mb-10 flex items-end justify-between gap-4">
              <h2 id="similar-title" className="text-2xl font-medium tracking-[-0.02em] sm:text-3xl">Схожі товари</h2>
              <Link href="/#catalog" className="inline-flex min-h-11 items-center gap-1.5 text-sm underline underline-offset-4 hover:no-underline">
                Весь каталог
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-x-6">
              {similarProducts.map((p) => (
                <ProductCardDetailed
                  key={p.id}
                  product={p as Product}
                  colorVariants={allVariants.filter((v) => v.product_id === p.id)}
                  materials={materials}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <FooterSection tagline={tHero("heading")} copyright={tFooter("copyright")} instagram="https://www.instagram.com/u.do.craft/" telegram="https://t.me/udostore" />
    </div>
  );
}

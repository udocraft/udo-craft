"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, Material, ProductColorVariant, ProductMarketingMeta } from "@udo-craft/shared";
import { DEFAULT_PRODUCT_FEATURE_GROUPS, getAllImages, getCustomizableImages, normalizeProductMarketingMeta, resolveProductImages } from "@udo-craft/shared";
import { ArrowLeft, ArrowRight, Award, BadgePercent, Check, ChevronLeft, ChevronRight, Clock3, Layers3, Minus, PackageCheck, Paintbrush, Ruler, Shield, Shirt, ShoppingBag, Star, Tags, Truck, Zap, Plus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { FooterSection } from "@/app/_sections/FooterSection";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { SizeChartModal } from "@/components/SizeChartModal";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductWithMeta extends Omit<Product, "description" | "marketing_meta"> {
  description?: string;
  category_id?: string | null;
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
  marketing_meta?: ProductMarketingMeta;
}

const SESSION_KEY = "client-order-draft";

function fmtPrice(cents: number) {
  return `₴${(cents / 100).toFixed(0)}`;
}

function getDiscount(grid: { qty: number; discount_pct: number }[] | undefined, qty: number) {
  if (!grid?.length) return 0;
  return [...grid].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty)?.discount_pct ?? 0;
}

// ── Trust badges ──────────────────────────────────────────────────────────────

const FEATURE_ICONS = {
  layers: Layers3,
  shirt: Shirt,
  award: Award,
  truck: Truck,
  ruler: Ruler,
  tags: Tags,
  sparkles: Zap,
  zap: Zap,
};

type InfoTab = "description" | "delivery" | "files";

const INFO_TABS: Array<{ id: InfoTab; label: string }> = [
  { id: "description", label: "Опис" },
  { id: "delivery", label: "Доставка" },
  { id: "files", label: "Інструкції щодо файлів" },
];

function textLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function RichTextBlock({ text }: { text: string }) {
  const lines = textLines(text);
  const bullets = lines.filter((line) => /^[-•]\s+/.test(line));
  const paragraphs = lines.filter((line) => !/^[-•]\s+/.test(line));

  return (
    <div className="space-y-5 text-lg leading-8 text-foreground/90">
      {paragraphs.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {bullets.length > 0 && (
        <ul className="list-disc space-y-2 pl-7">
          {bullets.map((line) => (
            <li key={line}>{line.replace(/^[-•]\s+/, "")}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface ProductDetailClientProps {
  product: ProductWithMeta;
  allProducts: ProductWithMeta[];
  variants: ProductColorVariant[];
  allVariants: ProductColorVariant[];
  materials: Material[];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ProductDetailClient({
  product,
  allProducts,
  variants,
  allVariants,
  materials,
}: ProductDetailClientProps) {
  const router = useRouter();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [selectedSize, setSelectedSize]           = useState<string | null>(null);
  const [quantity, setQuantity]                   = useState(1);

  const initialAllImgs = resolveProductImages((product as any).product_images, product.images as Record<string, string>);
  const initialKeys = initialAllImgs.sort((a, b) => a.sort_order - b.sort_order).map((i) => i.key);

  const [activeImageKey, setActiveImageKey]       = useState<string>(initialKeys[0] ?? "front");
  const [imageKeys, setImageKeys]                 = useState<string[]>(initialKeys);
  const [added, setAdded]                         = useState(false);
  const [activeInfoTab, setActiveInfoTab]          = useState<InfoTab>("description");

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  const productImgArr = resolveProductImages((product as any).product_images, product.images as Record<string, string>);
  const variantImgArr = selectedVariant
    ? resolveProductImages((selectedVariant as any).variant_images, selectedVariant.images as Record<string, string>)
    : null;
  const activeImgArr  = variantImgArr?.length ? variantImgArr : productImgArr;
  const currentImages = getAllImages(activeImgArr);
  const activeImageUrl = currentImages[activeImageKey] ?? Object.values(currentImages)[0] ?? "";

  const colorDots = variants.map((v) => {
    const mat = materials.find((m) => m.id === v.material_id);
    return { id: v.id, name: mat?.name ?? "—", hex: mat?.hex_code ?? "#ccc" };
  });

  const sizes          = product.available_sizes ?? [];
  const meta           = normalizeProductMarketingMeta(product.marketing_meta);
  const discountPct    = getDiscount(product.discount_grid, quantity);
  const unitCents      = product.base_price_cents ?? 0;
  const discountedCents = Math.round(unitCents * (1 - discountPct / 100));
  const totalCents     = discountedCents * quantity;
  const discountTiers = [...(product.discount_grid ?? [])].sort((a, b) => a.qty - b.qty);
  const nextDiscount = discountTiers.find((tier) => quantity < tier.qty);
  const sliderMax = Math.max(100, meta.min_order_qty, quantity, discountTiers.at(-1)?.qty ?? 0);
  const sliderMarks = Array.from(new Set([1, meta.min_order_qty, ...discountTiers.map((tier) => tier.qty), sliderMax])).sort((a, b) => a - b);
  const trustBadges = [
    { icon: Clock3, label: `${meta.delivery_min_days}–${meta.delivery_max_days} днів виробництво` },
    { icon: PackageCheck, label: `Від ${meta.min_order_qty} одиниць` },
    { icon: Shield, label: "Контроль якості" },
  ];
  const maxDiscountPct = Math.max(0, ...(product.discount_grid ?? []).map((tier) => tier.discount_pct));

  // Similar products — same category, exclude current
  const similarProducts = allProducts
    .filter((p) => p.id !== product.id && p.category_id === product.category_id && p.is_active)
    .slice(0, 4);

  const prevImage = () => {
    const idx = imageKeys.indexOf(activeImageKey);
    setActiveImageKey(imageKeys[(idx - 1 + imageKeys.length) % imageKeys.length]);
  };
  const nextImage = () => {
    const idx = imageKeys.indexOf(activeImageKey);
    setActiveImageKey(imageKeys[(idx + 1) % imageKeys.length]);
  };

  const handleAddToCart = useCallback(() => {
    const size  = selectedSize ?? sizes[Math.floor(sizes.length / 2)] ?? "";
    const color = materials.find((m) => m.id === selectedVariant?.material_id)?.name ?? "Стандарт";
    const vImgs = selectedVariant ? resolveProductImages((selectedVariant as any).variant_images, selectedVariant.images as Record<string, string>) : null;
    const pImgs = resolveProductImages((product as any).product_images, product.images as Record<string, string>);
    const resolvedImgs = getCustomizableImages(vImgs?.length ? vImgs : pImgs);
    const productImage = resolvedImgs.front ?? Object.values(resolvedImgs)[0] ?? "";

    const cartItem = {
      productId: product.id, productName: product.name, productImage,
      productPrice: product.base_price_cents, unitPriceCents: discountedCents,
      printCostCents: 0, quantity, size, color, layers: [],
    };
    try {
      const raw   = sessionStorage.getItem(SESSION_KEY);
      const draft = raw ? JSON.parse(raw) : { step: "select", contact: {}, cart: [] };
      draft.cart  = [...(draft.cart ?? []), cartItem];
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event("udo_cart_update"));
    } catch { /* quota */ }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, selectedSize, selectedVariant, materials, quantity, discountedCents, sizes]);

  const handleCustomize = useCallback(() => {
    const size  = selectedSize ?? sizes[Math.floor(sizes.length / 2)] ?? "";
    const color = materials.find((m) => m.id === selectedVariant?.material_id)?.name ?? "";
    const params = new URLSearchParams({ product: product.slug || product.id, customize: "1" });
    if (size)                params.set("size", size);
    if (color)               params.set("color", color);
    if (selectedVariant?.id) params.set("variant", selectedVariant.id);
    router.push(`/order?${params.toString()}`);
  }, [product, selectedSize, selectedVariant, materials, sizes, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />

      {/* Page load fade-in */}
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="fixed inset-0 bg-white z-[100] pointer-events-none" />

      <main className="flex-1 pt-24">

        {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground transition-colors">Головна</Link>
            <span aria-hidden="true">/</span>
            <Link href="/#catalog" className="hover:text-foreground transition-colors">Каталог</Link>
            <span aria-hidden="true">/</span>
            <span className="text-foreground font-medium truncate">{product.name}</span>
          </nav>
        </div>

        {/* ── Product grid ───────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-start">

            {/* LEFT — gallery */}
            <div className="flex flex-col gap-3 lg:sticky lg:top-24">
              {/* Main image */}
              <div className="relative aspect-square bg-[#f5f5f5] rounded-3xl overflow-hidden group">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImageKey + (selectedVariantId ?? "")}
                    src={activeImageUrl}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-contain p-2"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>

                {imageKeys.length > 1 && (
                  <>
                    <button onClick={prevImage} aria-label="Попереднє фото"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-white hover:scale-105 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextImage} aria-label="Наступне фото"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-white hover:scale-105 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Image counter pill */}
                {imageKeys.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-white text-[10px] font-semibold">
                    {imageKeys.indexOf(activeImageKey) + 1} / {imageKeys.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {imageKeys.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {imageKeys.map((key) => (
                    <button key={key} onClick={() => setActiveImageKey(key)}
                      aria-label={`Фото ${key}`} aria-pressed={activeImageKey === key}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-[#f5f5f5] border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        activeImageKey === key ? "border-primary shadow-sm" : "border-transparent hover:border-border"
                      }`}>
                      <img src={currentImages[key]} alt={key} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — product info */}
            <div className="flex flex-col gap-6">

              {/* Name + price */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">{product.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <div className="inline-flex items-center gap-1.5" aria-label={`Рейтинг ${meta.rating_avg} із 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(meta.rating_avg) ? "fill-amber-400 text-amber-400" : "text-amber-200"}`}
                      />
                    ))}
                    <span className="text-sm font-semibold">{meta.rating_avg.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-primary font-medium">{meta.rating_count.toLocaleString("uk-UA")} відгуків</span>
                  {(meta.badges ?? []).slice(0, 2).map((badge) => (
                    <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="flex items-baseline gap-3 mt-3">
                  <span className="text-3xl font-black text-primary">{fmtPrice(discountedCents)}</span>
                  {discountPct > 0 && (
                    <>
                      <span className="text-base text-muted-foreground line-through">{fmtPrice(unitCents)}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">-{discountPct}%</span>
                    </>
                  )}
                </div>
                {quantity > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Разом: <span className="font-semibold text-foreground">{fmtPrice(totalCents)}</span> за {quantity} шт
                  </p>
                )}
              </div>

              {/* Color */}
              {colorDots.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-sm font-semibold">
                    Колір:{" "}
                    <span className="text-muted-foreground font-normal">
                      {materials.find((m) => m.id === selectedVariant?.material_id)?.name ?? "—"}
                    </span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {colorDots.map((c) => (
                      <button key={c.id}
                        onClick={() => {
                          setSelectedVariantId(c.id);
                          const v = variants.find((vv) => vv.id === c.id);
                          const vImgs = resolveProductImages((v as any)?.variant_images, v?.images as Record<string, string>);
                          const pImgs = resolveProductImages((product as any).product_images, product.images as Record<string, string>);
                          const allImgs = getAllImages(vImgs.length ? vImgs : pImgs);
                          const keys = Object.keys(allImgs);
                          setImageKeys(keys);
                          setActiveImageKey(keys[0] ?? "front");
                        }}
                        aria-label={c.name} aria-pressed={selectedVariantId === c.id}
                        title={c.name}
                        className={`w-7 h-7 rounded-full shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          selectedVariantId === c.id
                            ? "ring-2 ring-offset-1 ring-foreground scale-110"
                            : "ring-1 ring-border hover:ring-foreground/40 hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Size */}
              {sizes.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Розмір</p>
                    {product.size_chart_id && (
                      <SizeChartModal chartId={product.size_chart_id} />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {sizes.map((s) => (
                      <button key={s}
                        onClick={() => setSelectedSize(s === selectedSize ? null : s)}
                        aria-pressed={selectedSize === s}
                        className={`h-10 rounded-lg border px-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selectedSize === s
                            ? "bg-foreground text-background border-foreground"
                            : "border-border hover:border-foreground/40 text-foreground hover:bg-muted"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2.5">
                <p className="text-sm font-semibold">Кількість</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Зменшити кількість"
                    className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Minus className="w-4 h-4" />
                  </button>
                  <label className="sr-only" htmlFor="product-quantity">Кількість</label>
                  <input
                    id="product-quantity"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                    className="h-10 w-20 rounded-full border border-border bg-background text-center text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-live="polite"
                  />
                  <button onClick={() => setQuantity((q) => q + 1)}
                    aria-label="Збільшити кількість"
                    className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Plus className="w-4 h-4" />
                  </button>
                  {quantity >= 10 && (
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Знижка {discountPct > 0 ? `-${discountPct}%` : "доступна"}
                    </span>
                  )}
                </div>
              </div>

              {/* Bulk pricing */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-black">
                      <BadgePercent className="w-4 h-4 text-primary" />
                      Калькулятор оптової ціни
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{meta.promo_note}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <input
                      type="range"
                      min={1}
                      max={sliderMax}
                      value={Math.min(quantity, sliderMax)}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                      list="product-quantity-marks"
                      className="h-2 flex-1 cursor-pointer accent-foreground"
                      aria-label="Кількість товарів для оптової ціни"
                    />
                    <span className="w-28 text-right text-lg font-bold">{quantity} товарів</span>
                  </div>
                  <datalist id="product-quantity-marks">
                    {sliderMarks.map((mark) => (
                      <option key={mark} value={mark} />
                    ))}
                  </datalist>
                  <div className="relative h-5">
                    {sliderMarks.map((mark) => (
                      <button
                        key={mark}
                        type="button"
                        onClick={() => setQuantity(mark)}
                        className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                        style={{ left: `${((mark - 1) / Math.max(1, sliderMax - 1)) * 100}%` }}
                      >
                        {mark}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Ціна зі знижкою</p>
                    <p className="text-2xl font-black">{fmtPrice(discountedCents)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Поточна знижка</p>
                    <p className="text-2xl font-black">{discountPct}%</p>
                  </div>
                </div>
                {nextDiscount && (
                  <Link href={meta.guide_url || "/#contact"} className="flex items-start gap-2 text-sm text-primary hover:underline">
                    <Tags className="mt-0.5 w-4 h-4 shrink-0" />
                    Замовте ще {nextDiscount.qty - quantity} шт, щоб отримати знижку {nextDiscount.discount_pct}%.
                  </Link>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={handleCustomize}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold text-sm px-6 py-3.5 rounded-full active:scale-95 transition-all duration-200 shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Paintbrush className="w-4 h-4" />
                  Додати принт
                </button>
                <button onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2 border-2 border-primary text-primary hover:bg-primary/5 font-bold text-sm px-6 py-3.5 rounded-full active:scale-95 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <AnimatePresence mode="wait" initial={false}>
                    {added ? (
                      <motion.span key="added" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="flex items-center gap-2">
                        <Check className="w-4 h-4" /> Додано до кошика
                      </motion.span>
                    ) : (
                      <motion.span key="add" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4" /> Без принту
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-muted/50 text-center">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</span>
                  </div>
                ))}
              </div>

              {/* Back link */}
              <Link href="/#catalog"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="w-3.5 h-3.5" />
                Повернутись до каталогу
              </Link>
            </div>
          </div>
        </div>

        {/* ── Ecommerce info tabs ──────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14">
          <div className="border-b border-border overflow-x-auto">
            <div role="tablist" aria-label="Інформація про товар" className="flex min-w-max items-end gap-10 sm:gap-16">
              {INFO_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeInfoTab === tab.id}
                  aria-controls={`product-info-${tab.id}`}
                  onClick={() => setActiveInfoTab(tab.id)}
                  className={`relative px-1 pb-4 text-xl sm:text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    activeInfoTab === tab.id ? "font-black text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {activeInfoTab === tab.id && (
                    <motion.span layoutId="product-info-tab" className="absolute inset-x-0 -bottom-px h-1 rounded-full bg-foreground" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8">
            <AnimatePresence mode="wait">
              {activeInfoTab === "description" && (
                <motion.div
                  key="description"
                  id="product-info-description"
                  role="tabpanel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-4xl"
                >
                  <RichTextBlock text={product.description || `${product.name} для корпоративного мерчу, брендованих подій і командного одягу.`} />
                </motion.div>
              )}

              {activeInfoTab === "delivery" && (
                <motion.div
                  key="delivery"
                  id="product-info-delivery"
                  role="tabpanel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="grid max-w-5xl gap-6 md:grid-cols-[1.2fr_0.8fr]"
                >
                  <RichTextBlock text={meta.delivery_note || ""} />
                  <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                    {trustBadges.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
                        <Icon className="size-5 text-primary" strokeWidth={1.7} />
                        <span className="text-sm font-bold">{label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeInfoTab === "files" && (
                <motion.div
                  key="files"
                  id="product-info-files"
                  role="tabpanel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="max-w-4xl"
                >
                  <RichTextBlock text={meta.file_guidelines || ""} />
                  <Link href={meta.guide_url || "/#contact"} className="mt-6 inline-flex items-center gap-2 text-base font-bold text-primary hover:underline">
                    Перейти до консультації
                    <ArrowRight className="size-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Product confidence details ───────────────────────────────── */}
        <section className="border-y border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
            <div className="grid md:grid-cols-3 gap-8">
              {(meta.feature_groups ?? DEFAULT_PRODUCT_FEATURE_GROUPS).slice(0, 4).map((group) => {
                const Icon = FEATURE_ICONS[group.icon as keyof typeof FEATURE_ICONS] ?? Zap;
                return (
                  <div key={group.title} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-3">
                      <div className="size-10 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm">
                        <Icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
                      </div>
                      <h2 className="text-lg font-black tracking-tight">{group.title}</h2>
                    </div>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={`${group.title}-${item.title}`} className="flex gap-2.5">
                          <Check className="mt-1 w-4 h-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-sm font-bold">{item.title}</p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── CTA banner ─────────────────────────────────────────────────── */}
        <div className="bg-primary">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-white font-black text-xl sm:text-2xl">Потрібен корпоративний тираж?</p>
              <p className="text-white/70 text-sm mt-1">Від {meta.min_order_qty} одиниць · Знижки до {maxDiscountPct}% · {meta.delivery_min_days}–{meta.delivery_max_days} днів виробництво</p>
            </div>
            <Link href="/#contact"
              className="shrink-0 inline-flex items-center gap-2 bg-white text-primary font-bold text-sm px-7 py-3.5 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-lg">
              Обговорити проєкт
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── Similar products ────────────────────────────────────────────── */}
        {similarProducts.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Схожі товари</h2>
                <p className="text-sm text-muted-foreground mt-1">Вам також може сподобатись</p>
              </div>
              <Link href="/#catalog"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                Весь каталог <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

      <FooterSection tagline="Одяг, який стає частиною вашої корпоративної ДНК" copyright="© 2026 U:DO CRAFT. Всі права захищені." instagram="https://www.instagram.com/u.do.craft/" telegram="https://t.me/udostore" />
    </div>
  );
}

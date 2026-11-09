"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, ArrowLeft, ArrowRight, BadgePercent, Check, ChevronDown, ChevronLeft, ChevronRight, CircleSlash, Minus, Plus, Tags, ToolCase } from "lucide-react";
import { Button } from "@udo-craft/ui";
import { Link } from "@/i18n/navigation";
import { SizeChartModal } from "@/components/SizeChartModal";

const SESSION_KEY = "client-order-draft";

export interface PurchaseColor {
  id: string;
  name: string;
  hex: string;
  images: Record<string, string>;
}

export interface PurchaseProps {
  productId: string;
  slug: string;
  name: string;
  basePriceCents: number;
  sizes: string[];
  sizeChartId: string | null;
  discountGrid: { qty: number; discount_pct: number }[];
  minOrderQty: number;
  promoNote: string;
  guideUrl: string;
  colors: PurchaseColor[];
  /** Used when the product has no colour variants. */
  defaultImages: Record<string, string>;
  /** Server-rendered title and badges, shown above the price. */
  children: React.ReactNode;
}

const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;

function discountFor(grid: PurchaseProps["discountGrid"], qty: number) {
  return [...grid].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty)?.discount_pct ?? 0;
}

/**
 * Client island for the product page: gallery, colour/size/quantity pickers,
 * live price and add-to-cart. Everything static (title, description, specs)
 * is rendered by the server page around it.
 */
export function ProductPurchase(p: PurchaseProps) {
  const router = useRouter();
  const [colorId, setColorId] = useState<string | null>(p.colors[0]?.id ?? null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  const color = p.colors.find((c) => c.id === colorId) ?? null;
  const images = color && Object.keys(color.images).length > 0 ? color.images : p.defaultImages;
  const keys = Object.keys(images);
  const activeKey = imageKey && images[imageKey] ? imageKey : keys[0];
  const activeUrl = activeKey ? images[activeKey] : "";
  const step = (delta: number) => setImageKey(keys[(keys.indexOf(activeKey) + delta + keys.length) % keys.length]);

  const discountPct = discountFor(p.discountGrid, quantity);
  const unitCents = Math.round(p.basePriceCents * (1 - discountPct / 100));
  const tiers = [...p.discountGrid].sort((a, b) => a.qty - b.qty);
  const nextTier = tiers.find((tier) => quantity < tier.qty);
  const sliderMax = Math.max(100, p.minOrderQty, quantity, tiers[tiers.length - 1]?.qty ?? 0);
  const marks = Array.from(new Set([1, p.minOrderQty, ...tiers.map((t) => t.qty), sliderMax])).sort((a, b) => a - b);
  const chosenSize = size ?? p.sizes[Math.floor(p.sizes.length / 2)] ?? "";

  // Sticky mobile bar: shown once the main buttons have scrolled above the viewport.
  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const customize = useCallback(() => {
    const params = new URLSearchParams({ product: p.slug || p.productId, customize: "1" });
    if (chosenSize) params.set("size", chosenSize);
    if (color?.name) params.set("color", color.name);
    if (color?.id) params.set("variant", color.id);
    router.push(`/order?${params.toString()}`);
  }, [p.slug, p.productId, chosenSize, color, router]);

  const addWithoutPrint = useCallback(() => {
    const cartItem = {
      productId: p.productId,
      productName: p.name,
      productImage: images.front ?? Object.values(images)[0] ?? "",
      productPrice: p.basePriceCents,
      unitPriceCents: unitCents,
      printCostCents: 0,
      quantity,
      size: chosenSize,
      color: color?.name ?? "Стандарт",
      layers: [],
    };
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const draft = raw ? JSON.parse(raw) : { step: "select", contact: {}, cart: [] };
      draft.cart = [...(draft.cart ?? []), cartItem];
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
      window.dispatchEvent(new Event("udo_cart_update"));
    } catch { /* storage full or blocked */ }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [p, images, unitCents, quantity, chosenSize, color]);

  const round = "flex size-11 items-center justify-center rounded-full border border-border transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
      {/* Gallery */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="group relative aspect-square overflow-hidden rounded-media border border-border bg-white">
          {!activeUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageOff className="size-10" aria-hidden="true" />
              <p className="text-sm">Фото незабаром</p>
            </div>
          )}
          {activeUrl && (
            <img src={activeUrl} alt={p.name} width={1088} height={1088} fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-contain p-4 sm:p-8" />
          )}
          {keys.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Попереднє фото" className={`${round} absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100`}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Наступне фото" className={`${round} absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100`}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              <p className="absolute bottom-3 right-3 inverse rounded-full bg-background px-2.5 py-1 text-xs font-medium text-foreground" aria-live="polite">
                {keys.indexOf(activeKey) + 1} / {keys.length}
              </p>
            </>
          )}
        </div>

        {keys.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setImageKey(key)}
                aria-label={`Фото ${key}`}
                aria-pressed={activeKey === key}
                className={`size-16 shrink-0 overflow-hidden rounded-card border-2 bg-white transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeKey === key ? "border-primary" : "border-transparent hover:border-border"
                }`}
              >
                <img src={images[key]} alt="" loading="lazy" className="size-full object-contain p-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Purchase panel */}
      <div className="flex flex-col gap-6">
        <div>
          {p.children}
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className="text-h2 font-semibold text-primary">{fmtPrice(unitCents)}</span>
            {discountPct > 0 && (
              <>
                <span className="text-muted-foreground line-through">{fmtPrice(p.basePriceCents)}</span>
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">-{discountPct}%</span>
              </>
            )}
          </div>
          {quantity > 1 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Разом: <span className="font-semibold text-foreground">{fmtPrice(unitCents * quantity)}</span> за {quantity} шт
            </p>
          )}
        </div>

        {p.colors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Колір: <span className="font-normal text-muted-foreground">{color?.name ?? "—"}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              {p.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setColorId(c.id); setImageKey(null); }}
                  aria-label={c.name}
                  aria-pressed={colorId === c.id}
                  title={c.name}
                  className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span
                    className={`size-7 rounded-full border border-border transition-shadow duration-fast ${colorId === c.id ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {p.sizes.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Розмір</p>
              {p.sizeChartId && <SizeChartModal chartId={p.sizeChartId} />}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s === size ? null : s)}
                  aria-pressed={size === s}
                  className={`h-11 rounded-card border px-3 text-sm font-semibold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    size === s ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground/40 hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="product-quantity" className="text-sm font-semibold">Кількість</label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={round} aria-label="Зменшити кількість" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <input
              id="product-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="h-11 w-20 rounded-full border border-input bg-background text-center text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button type="button" className={round} aria-label="Збільшити кількість" onClick={() => setQuantity((q) => q + 1)}>
              <Plus className="size-4" aria-hidden="true" />
            </button>
            {quantity >= 10 && (
              <span className="rounded-card bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                Знижка {discountPct > 0 ? `-${discountPct}%` : "доступна"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-card border border-border bg-muted/40">
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            aria-expanded={bulkOpen}
            aria-controls="bulk-calculator"
            className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors duration-fast hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <BadgePercent className="size-4 text-primary" aria-hidden="true" /> Калькулятор оптової ціни
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{p.promoNote}</span>
            </span>
            <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-base ${bulkOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {bulkOpen && (
            <div id="bulk-calculator" className="space-y-4 border-t border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="range"
                  min={1}
                  max={sliderMax}
                  value={Math.min(quantity, sliderMax)}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="h-2 flex-1 cursor-pointer accent-foreground"
                  aria-label="Кількість товарів для оптової ціни"
                />
                <span className="w-28 text-right text-lg font-semibold tabular-nums">{quantity} товарів</span>
              </div>
              <div className="relative h-11">
                {marks.map((mark) => (
                  <button
                    key={mark}
                    type="button"
                    onClick={() => setQuantity(mark)}
                    className="absolute top-0 flex min-h-11 min-w-11 -translate-x-1/2 items-center justify-center text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ left: `${((mark - 1) / Math.max(1, sliderMax - 1)) * 100}%` }}
                  >
                    {mark}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Ціна зі знижкою</p>
                  <p className="text-h3 font-semibold">{fmtPrice(unitCents)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Поточна знижка</p>
                  <p className="text-h3 font-semibold">{discountPct}%</p>
                </div>
              </div>
              {nextTier && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Tags className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Замовте ще {nextTier.qty - quantity} шт, щоб отримати знижку {nextTier.discount_pct}%.
                </p>
              )}
              <Button asChild variant="primary" className="w-full">
                <Link href={p.guideUrl}>
                  Отримати консультацію по тиражу <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div ref={ctaRef} className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button type="button" onClick={customize} variant="primary" className="flex-1">
            <ToolCase aria-hidden="true" /> Додати принт
          </Button>
          <Button type="button" onClick={addWithoutPrint} variant="outline" className="flex-1">
            {added ? <Check aria-hidden="true" /> : <CircleSlash aria-hidden="true" />}
            {added ? "Додано до кошика" : "Без принту"}
          </Button>
          <span role="status" className="sr-only">{added ? "Додано до кошика" : ""}</span>
        </div>

        <Link href="/#catalog" className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden="true" /> Повернутись до каталогу
        </Link>
      </div>

      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-sm font-semibold text-primary">{fmtPrice(unitCents)}</p>
          </div>
          <Button type="button" onClick={customize} variant="primary">
            <ToolCase aria-hidden="true" /> Додати принт
          </Button>
        </div>
      )}
    </div>
  );
}

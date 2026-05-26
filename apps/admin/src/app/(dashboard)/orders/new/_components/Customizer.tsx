"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Product, PrintZone, Material, ProductColorVariant, useCustomizer, type SidebarTabId, resolveProductImages, getCustomizableImages } from "@udo-craft/shared";
import { ArrowLeft, X, Loader2, Layers, Pencil, Type, Upload, LayoutList, MirrorRound, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { type PrintLayer } from "@/components/print-types";
import { QtyPricePanel } from "./QtyPricePanel";
import { type TextLayerPatch } from "./editor/TextPanel";
import { GenerationDrawer } from "./GenerationDrawer";
import EditorSidebar from "./editor/EditorSidebar";
import PrintsPanel from "./editor/PrintsPanel";
import DrawPanel from "./editor/DrawPanel";
import TextPanel from "./editor/TextPanel";
import UploadPanel from "./editor/UploadPanel";
import MobileSheet from "./editor/MobileSheet";
import LayersList from "@/components/layers-list";
import type { TextComposition } from "@udo-craft/shared";
import { useLayersBadge } from "@/hooks/useLayersBadge";

const ProductCanvas = dynamic(() => import("@/components/product-canvas"), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
}

interface SizeChart { id: string; name: string; rows: Record<string, string>[]; }

interface CartItem {
  productId: string; productName: string; productImage: string; productPrice: number;
  unitPriceCents: number; printCostCents: number; quantity: number; size: string; color: string;
  itemNote?: string; layers?: PrintLayer[]; mockupDataUrl?: string; mockupUploadedUrl?: string;
  mockupBackDataUrl?: string; mockupsMap?: Record<string, string>; offsetTopMm?: number;
  printZone?: PrintZone | null;
}

export interface CustomizerProps {
  product: ProductWithConfig;
  printZones: { front?: PrintZone | null; back?: PrintZone | null };
  sizeChart?: SizeChart | null;
  materials: Material[];
  variants: ProductColorVariant[];
  initialVariant?: ProductColorVariant | null;
  initialLayers?: PrintLayer[];
  initialSize?: string;
  initialQuantity?: number;
  initialNote?: string;
  onAdd: (item: CartItem) => void;
  onClose: () => void;
}

// ── Mobile tab config ─────────────────────────────────────────────────────

const MOBILE_TABS: { id: SidebarTabId; label: string; Icon: React.ElementType }[] = [
  { id: "prints",  label: "Принти",  Icon: Layers      },
  { id: "draw",    label: "Малюнок", Icon: Pencil      },
  { id: "text",    label: "Текст",   Icon: Type        },
  { id: "upload",  label: "Файл",    Icon: Upload      },
  { id: "layers",  label: "Шари",    Icon: LayoutList  },
];

// ── Customizer ────────────────────────────────────────────────────────────

export function Customizer({ product, printZones, sizeChart, materials, variants,
  initialVariant, initialLayers, initialSize, initialQuantity, initialNote, onAdd, onClose,
}: CustomizerProps) {
  void sizeChart;
  const canvasSaveRef = useRef<(() => void) | null>(null);
  const fabricCanvasRef = useRef<import("fabric").fabric.Canvas | null>(null);

  const { layers, activeLayerId, setActiveLayerId, mockups, setMockups, layersRef, captureRef,
    setLayersWithRef, addLayer: addLayerFromHook, addTextLayer: addTextLayerFromHook,
    resolveLayerPrice: resolveLayerPriceFromHook, handleAddToCart: handleAddToCartFromHook,
  } = useCustomizer({ uploadUrl: "/api/upload", uploadResponseKey: "results[0].url", uploadTags: "print" });

  useEffect(() => {
    if (initialLayers && initialLayers.length > 0) setLayersWithRef(initialLayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultVariant = initialVariant ?? variants[0] ?? null;
  const defaultColor = defaultVariant ? (materials.find((m) => m.id === defaultVariant.material_id)?.name ?? "black") : "black";
  const firstImageKey = (() => {
    const productImgs = resolveProductImages(product.product_images, product.images ?? {});
    const variantImgs = defaultVariant ? resolveProductImages(defaultVariant.variant_images, defaultVariant.images ?? {}) : null;
    const imgs = getCustomizableImages(variantImgs?.length ? variantImgs : productImgs);
    return Object.keys(imgs)[0] ?? "front";
  })();

  const [selectedSize, setSelectedSize] = useState((initialSize ?? "") as string);
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [selectedVariant, setSelectedVariant] = useState<ProductColorVariant | null>(defaultVariant);
  const [quantity, setQuantity] = useState(initialQuantity ?? 1);
  const [activeSide, setActiveSide] = useState<string>(firstImageKey);
  const [offsetTopMm, setOffsetTopMm] = useState(0);
  const [itemNote, setItemNote] = useState(initialNote ?? "");
  const [printPricing, setPrintPricing] = useState<{ id: string; print_type: string; size_label: string; size_min_cm: number; size_max_cm: number; qty_tiers: { min_qty: number; price_cents: number }[] }[]>([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [layerScales, setLayerScales] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<SidebarTabId | null>(null);
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [drawingEditLayerId, setDrawingEditLayerId] = useState<string | null>(null);

  // Tab title badge
  useLayersBadge(layers.length, `${product.name} — U:DO CRAFT Admin`);

  const productImages = getCustomizableImages(
    resolveProductImages(
      selectedVariant?.variant_images ?? product.product_images,
      selectedVariant?.images ?? product.images ?? {}
    )
  );

  const addLayerForAI = (file: File, side: string, pricing: typeof printPricing) =>
    addLayerFromHook(file, side, pricing);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    fetch("/api/print-type-pricing").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setPrintPricing(d); }).catch(() => {});
  }, []);

  const discountPct = (() => {
    const grid = product.discount_grid;
    if (!grid?.length) return 0;
    return [...grid].sort((a, b) => b.qty - a.qty).find((t) => quantity >= t.qty)?.discount_pct ?? 0;
  })();
  const unitPrice = product.base_price_cents / 100;
  const discounted = unitPrice * (1 - discountPct / 100);
  const resolveLayerPrice = (layer: PrintLayer) => resolveLayerPriceFromHook(layer, quantity, printPricing);
  const printCostPerUnit = layers.reduce((sum, layer) => sum + resolveLayerPrice(layer) / 100, 0);
  const requiresGarmentSize = Array.isArray(product.available_sizes) && product.available_sizes.length > 0;
  const hasIncompletePrintSizes = layers.some((layer) => !layer.sizeLabel);
  const addDisabledReason = requiresGarmentSize && !selectedSize ? "Оберіть розмір товару."
    : hasIncompletePrintSizes ? "Оберіть розмір для кожного нанесення." : null;

  const addLayer = (file: File) => addLayerFromHook(file, activeSide, printPricing);
  const addTextLayer = () => addTextLayerFromHook(activeSide, printPricing);

  const handleAddComposition = (composition: TextComposition) => {
    const now = Date.now();
    const placeholder = new File([], "text-layer.txt", { type: "text/plain" });
    const minSizeRow = printPricing
      .filter((r) => r.print_type === "dtf")
      .sort((a, b) => (a.size_min_cm + a.size_max_cm) / 2 - (b.size_min_cm + b.size_max_cm) / 2)[0];
    const base = {
      file: placeholder, url: "", type: "dtf" as const, side: activeSide,
      kind: "text" as const,
      sizeLabel: minSizeRow?.size_label, sizeMinCm: minSizeRow?.size_min_cm, sizeMaxCm: minSizeRow?.size_max_cm,
    };
    const newLayers = composition.layers.map((cl, i) => ({
      ...base,
      id: `text-${now}-${i}`,
      textContent: cl.textContent,
      textFont: cl.textFont,
      textFontSize: cl.textFontSize,
      textColor: cl.textColor,
      textAlign: cl.textAlign,
      textBold: cl.textBold,
      textItalic: cl.textItalic,
      textCurve: cl.textCurve,
      transform: cl.offsetY
        ? { left: 0, top: 260 + (cl.offsetY ?? 0), scaleX: 1, scaleY: 1, angle: 0, flipX: false }
        : undefined,
    }));
    setLayersWithRef((prev) => [...prev, ...newLayers]);
    setActiveLayerId(newLayers[0].id);
  };

  const selectedLayer = layers.find((l) => l.id === activeLayerId) ?? null;

  const handleRemoveBg = (id: string, newUrl: string) => {
    setLayersWithRef((prev) => prev.map((l) => (l.id === id ? { ...l, url: newUrl, uploadedUrl: undefined } : l)));
    fetch(newUrl).then((r) => r.blob()).then((blob) => {
      const fd = new FormData();
      fd.append("files", new File([blob], "print-nobg.png", { type: "image/png" }));
      fd.append("tags", "print");
      return fetch("/api/upload", { method: "POST", body: fd });
    }).then((r) => r.ok ? r.json() : null).then((data) => {
      const uploadedUrl = data?.results?.[0]?.url;
      if (uploadedUrl) setLayersWithRef((prev) => prev.map((l) => (l.id === id ? { ...l, uploadedUrl } : l)));
    }).catch(() => {});
  };

  const duplicateLayer = (id: string) => {
    const src = layersRef.current.find((l) => l.id === id);
    if (!src) return;
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const copy: PrintLayer = { ...src, id: newId };
    setLayersWithRef((prev) => { const idx = prev.findIndex((l) => l.id === id); const next = [...prev]; next.splice(idx + 1, 0, copy); return next; });
    setActiveLayerId(newId);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) { addLayer(f); return; } }
      }
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
      if (svgMatch) addLayer(new File([new Blob([svgMatch[0]], { type: "image/svg+xml" })], "pasted.svg", { type: "image/svg+xml" }));
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSide]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const dataUrl = captureRef.current?.() ?? "";
      if (dataUrl.startsWith("data:image")) setMockups((prev) => ({ ...prev, [activeSide]: dataUrl }));
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSide]);

  const handleAddToCart = async () => {
    if (addingToCart) return;
    if (requiresGarmentSize && !selectedSize) { toast.error("Оберіть розмір товару"); return; }
    if (hasIncompletePrintSizes) { toast.error("Оберіть розмір для кожного нанесення"); return; }
    setAddingToCart(true);
    try {
      const item = await handleAddToCartFromHook({
        activeSide, mockups, captureRef, layersRef, printPricing, quantity, discounted,
        printCostPerUnit, product, selectedSize, selectedColor, itemNote, offsetTopMm,
        printZone: printZones.front ?? printZones.back ?? null, requiresGarmentSize, hasIncompletePrintSizes,
      });
      onAdd(item);
    } finally { setAddingToCart(false); }
  };

  // ── Shared layer handlers ─────────────────────────────────────────────

  const layerHandlerProps = {
    layers,
    activeSide,
    activeLayerId,
    onSelect: setActiveLayerId,
    onDelete: (id: string) => { setLayersWithRef((prev) => prev.filter((l) => l.id !== id)); if (activeLayerId === id) setActiveLayerId(null); },
    onDuplicate: duplicateLayer,
    onReorder: setLayersWithRef,
    onTypeChange: (id: string, type: string) => setLayersWithRef((prev) => prev.map((l) => l.id !== id ? l : { ...l, type: type as PrintLayer["type"], sizeLabel: undefined, sizeMinCm: undefined, sizeMaxCm: undefined, priceCents: undefined, transform: undefined })),
    onSizeLabelChange: (id: string, sizeLabel: string) => setLayersWithRef((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const rows = printPricing.filter((r) => r.print_type === l.type);
      const row = rows.find((r) => r.size_label === sizeLabel) ?? rows[0];
      const sorted = row ? [...row.qty_tiers].sort((a, b) => b.min_qty - a.min_qty) : [];
      const tier = sorted.find((t) => quantity >= t.min_qty) ?? sorted[sorted.length - 1];
      return { ...l, sizeLabel, sizeMinCm: row?.size_min_cm, sizeMaxCm: row?.size_max_cm, priceCents: tier?.price_cents };
    })),
    onTextChange: (id: string, patch: TextLayerPatch) => setLayersWithRef((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l))),
    pricing: printPricing,
    quantity,
    layerScales,
    pxToMmRatio: product.px_to_mm_ratio || 0,
  };

  // ── Panel content helper ──────────────────────────────────────────────

  const panelContent = (tab: SidebarTabId | null) => {
    if (!tab) return null;
    if (tab === "prints") return <PrintsPanel activeSide={activeSide} printPricing={printPricing} onAddLayer={addLayer} />;
    if (tab === "draw") return (
      <DrawPanel
        fabricCanvasRef={fabricCanvasRef} layers={layers} activeSide={activeSide}
        activeLayerId={activeLayerId} onAddLayer={addLayer}
        onReplaceDrawLayer={(id, file) => setLayersWithRef((prev) => prev.map((l) => {
          if (l.id !== id) return l;
          return { ...l, file, kind: "drawing", url: URL.createObjectURL(file), uploadedUrl: undefined };
        }))}
        setLayersWithRef={setLayersWithRef}
        printZoneBounds={{ left: 0, top: 0, width: 0, height: 0 }}
        editRequestLayerId={drawingEditLayerId}
        onEditRequestHandled={() => setDrawingEditLayerId(null)}
      />
    );
    if (tab === "text") return (
      <TextPanel
        onAddTextLayer={addTextLayer}
        onAddComposition={handleAddComposition}
      />
    );
    if (tab === "upload") return <UploadPanel activeSide={activeSide} onFileAdd={addLayer} />;
    if (tab === "layers") return (
      <div className="p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Шари</p>
        {layers.filter((l) => l.side === activeSide).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Немає шарів. Додайте зображення або текст.</p>
        ) : (
          <LayersList {...layerHandlerProps} />
        )}
      </div>
    );
    return null;
  };

  const tabLabel = (tab: SidebarTabId | null) => {
    if (tab === "prints") return "Принти";
    if (tab === "draw") return "Малюнок";
    if (tab === "text") return "Текст";
    if (tab === "upload") return "Завантажити";
    if (tab === "layers") return "Шари";
    return "";
  };

  // ── Canvas ────────────────────────────────────────────────────────────

  const canvasPanel = (
    <ProductCanvas product={product} printZones={printZones} layers={layers} activeSide={activeSide}
      onSideChange={(side) => {
        const productImgs = resolveProductImages(product.product_images, product.images ?? {});
        const variantImgs = selectedVariant ? resolveProductImages(selectedVariant.variant_images, selectedVariant.images ?? {}) : null;
        const imgs = getCustomizableImages(variantImgs?.length ? variantImgs : productImgs);
        if (!imgs[side]) return;
        setActiveSide(side);
      }}
      variantImages={(() => {
        if (!selectedVariant) return undefined;
        const vi = resolveProductImages(selectedVariant.variant_images, selectedVariant.images ?? {});
        const imgs = getCustomizableImages(vi);
        return Object.keys(imgs).length > 0 ? imgs : undefined;
      })()}
      color={selectedColor} onSave={(dataUrl, side, mm) => { setMockups((prev) => ({ ...prev, [side]: dataUrl })); setOffsetTopMm(mm); }}
      onOffsetChange={setOffsetTopMm} saveRef={canvasSaveRef} fabricCanvasRef={fabricCanvasRef}
      captureRef={captureRef} activeLayerId={activeLayerId} onLayerSelect={setActiveLayerId}
      onRemoveBg={handleRemoveBg}
      onLayerDelete={(id) => { setLayersWithRef((prev) => prev.filter((l) => l.id !== id)); if (activeLayerId === id) setActiveLayerId(null); }}
      onLayerDuplicate={(layer) => { setLayersWithRef((prev) => [...prev, layer]); setActiveLayerId(layer.id); }}
      onLayerTransformChange={(id, transform) => { setLayerScales((prev) => ({ ...prev, [id]: transform.scaleX })); setLayersWithRef((prev) => prev.map((l) => (l.id === id ? { ...l, transform } : l))); }}
      onTextChange={(id, textContent) => setLayersWithRef((prev) => prev.map((l) => (l.id === id ? { ...l, textContent } : l)))}
      onLayerPatch={(id, patch) => {
        // SVG color patch needs special handling via layerHandlerProps.onTextChange
        if ((patch as any).svgFillColor !== undefined || (patch as any).svgStrokeColor !== undefined) {
          layerHandlerProps.onTextChange(id, patch as any);
        } else {
          setLayersWithRef((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
        }
      }}
      onOpenDrawingStudio={(layerId) => {
        setActiveLayerId(layerId);
        setActiveTab("draw");
        setDrawingEditLayerId(layerId);
      }}
    />
  );

  const hasColors = variants.length > 0;
  const hasSizes = Array.isArray(product.available_sizes) && product.available_sizes.length > 0;

  const colorSizeSection = (hasColors || hasSizes) ? (
    <div className="space-y-3 pb-3 mb-3 border-b border-border">
      {hasColors && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Колір</p>
          <div className="flex gap-2 flex-wrap">
            {variants.map((v) => {
              const mat = materials.find((m) => m.id === v.material_id);
              if (!mat) return null;
              const isSelected = selectedVariant?.id === v.id;
              const isWhite = mat.hex_code.toLowerCase() === "#ffffff" || mat.hex_code.toLowerCase() === "#f5f5f5";
              return (
                <button key={v.id} onClick={() => { setSelectedColor(mat.name); setSelectedVariant(v); }}
                  title={mat.name} aria-label={mat.name} aria-pressed={isSelected}
                  className={`cursor-pointer relative size-7 rounded-full transition-all flex items-center justify-center ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"} ${isWhite ? "border border-border" : ""}`}
                  style={{ backgroundColor: mat.hex_code }}>
                  {isSelected && <span className="size-2 rounded-full" style={{ backgroundColor: isWhite ? "#1a1a1a" : "#fff" }} />}
                </button>
              );
            })}
          </div>
          {selectedColor && <p className="text-xs text-muted-foreground">{selectedColor}</p>}
        </div>
      )}
      {hasSizes && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Розмір</p>
          <div className="flex gap-1.5 flex-wrap">
            {(product.available_sizes as string[]).map((size) => (
              <button key={size} onClick={() => setSelectedSize(size)} aria-pressed={selectedSize === size}
                className={`cursor-pointer min-w-[36px] h-9 px-2 rounded-lg text-sm font-semibold border transition-all ${selectedSize === size ? "bg-foreground text-background border-foreground shadow-sm" : "border-border hover:border-foreground/40 hover:bg-muted/50"}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  // Product thumbnail for the info card
  const productThumb = (() => {
    const productImgs = resolveProductImages(product.product_images, product.images ?? {});
    const variantImgs = selectedVariant ? resolveProductImages(selectedVariant.variant_images, selectedVariant.images ?? {}) : null;
    const imgs = getCustomizableImages(variantImgs?.length ? variantImgs : productImgs);
    return Object.values(imgs)[0] ?? "";
  })();

  const productInfoCard = (
    <div className="flex items-center gap-3 pb-3 mb-3 border-b border-border">
      {productThumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={productThumb} alt={product.name}
          className="size-14 rounded-xl object-cover border border-border shrink-0 bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">від {(product.base_price_cents / 100).toFixed(0)} ₴</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-none whitespace-nowrap"
      >
        Змінити
      </button>
    </div>
  );

  const rightPanel = (
    <>
      {productInfoCard}
      {colorSizeSection}
      <QtyPricePanel quantity={quantity} setQuantity={setQuantity} discountGrid={product.discount_grid}
        discountPct={discountPct} unitPrice={unitPrice} discounted={discounted} layers={layers}
        printPricing={printPricing} printCostPerUnit={printCostPerUnit} resolveLayerPrice={resolveLayerPrice}
        itemNote={itemNote} setItemNote={setItemNote} addDisabledReason={addDisabledReason}
        addingToCart={addingToCart} onAddToCart={() => void handleAddToCart()} hideButton />
    </>
  );

  const content = (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* ── Desktop layout ── */}
      <div className="flex flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[56px_auto_1fr_280px]">

        {/* 56px icon sidebar — desktop only */}
        <div className="hidden lg:block border-r border-border">
          <EditorSidebar activeTab={activeTab} onTabChange={setActiveTab} onBack={onClose} layerCount={layers.length} />
        </div>

        {/* Animated panel — desktop only */}
        <motion.div
          animate={{ width: activeTab ? 280 : 0, opacity: activeTab ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden lg:block overflow-hidden border-r border-border bg-card h-full"
          style={{ minWidth: 0 } as React.CSSProperties}
        >
          <div className="w-[280px] h-full overflow-y-auto">
            {panelContent(activeTab)}
          </div>
        </motion.div>

        {/* Canvas column */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start lg:justify-center p-3 lg:p-6 bg-muted/40">
          {/* Mobile top bar */}
          <div className="lg:hidden w-full h-11 mb-3 flex items-center justify-between bg-card rounded-xl px-3 border border-border">
            <button onClick={() => { if (!confirm("Повернутися? Незбережені зміни буде втрачено.")) return; onClose(); }}
              className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded">
              <ArrowLeft className="size-3.5" /> Назад
            </button>
            <p className="text-xs font-semibold truncate max-w-[140px]">{product.name}</p>
            <p className="text-xs font-bold text-primary shrink-0">{((discounted + printCostPerUnit) * quantity).toFixed(0)} ₴</p>
          </div>

          {/* Product info bar moved to right panel */}
          {canvasPanel}
        </div>

        {/* Right panel — desktop */}
        <div className="hidden lg:flex lg:flex-col h-full overflow-hidden border-l border-border bg-card">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">{rightPanel}</div>
          <div className="shrink-0 border-t border-border bg-card p-4 space-y-2">
            {/* AI try-on button */}
            <button type="button" onClick={() => setAiDrawerOpen(true)}
              disabled={layers.length === 0}
              className="w-full flex items-center gap-3 h-12 px-4 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/40">
              <MirrorRound className="size-5 text-primary shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-foreground leading-tight">Приміряти на людину</p>
                <p className="text-[10px] text-muted-foreground leading-tight">З допомогою AI</p>
              </div>
            </button>
            {addDisabledReason && !addingToCart && (
              <p className="text-xs text-destructive/80 text-center">{addDisabledReason}</p>
            )}
            <Button type="button" className="w-full h-11 text-sm font-semibold cursor-pointer"
              onClick={() => void handleAddToCart()} disabled={addingToCart || !!addDisabledReason}>
              {addingToCart ? <><Loader2 className="size-3.5 animate-spin mr-1.5" /> Додаємо...</> : "Додати до замовлення"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav — single source of truth ── */}
      <div className="lg:hidden relative z-[9999] shrink-0 border-t border-border bg-card overflow-hidden">
        <div className="flex">
          {MOBILE_TABS.map((tab) => (
            <button key={tab.id}
              onClick={() => { setMobilePriceOpen(false); setActiveTab(activeTab === tab.id ? null : tab.id); }}
              aria-label={tab.label} aria-pressed={activeTab === tab.id}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors min-h-[44px] ${activeTab === tab.id ? "text-primary border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}>
              <tab.Icon className="size-4" />{tab.label}
            </button>
          ))}
          <button onClick={() => { setActiveTab(null); setMobilePriceOpen((v) => !v); }}
            aria-label="Тираж та ціна"
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors min-h-[44px] ${mobilePriceOpen ? "text-primary border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}>
            <PackageOpen className="size-4" />Тираж
          </button>
        </div>
      </div>

      {/* Mobile panel sheet */}
      <MobileSheet
        open={!!activeTab && !mobilePriceOpen}
        onClose={() => setActiveTab(null)}
        title={tabLabel(activeTab)}
      >
        <div className="p-4">{panelContent(activeTab)}</div>
      </MobileSheet>

      {/* Mobile price sheet */}
      {mobilePriceOpen && (
        <div className="lg:hidden fixed inset-x-0 top-0 bottom-14 z-[9994] flex flex-col justify-end" onClick={() => setMobilePriceOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-background border-t border-border flex flex-col" style={{ maxHeight: "calc(100dvh - 56px - 44px)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-2.5 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="flex items-center justify-between px-4 pb-3 shrink-0">
              <p className="text-sm font-semibold">Тираж та ціна</p>
              <button onClick={() => setMobilePriceOpen(false)} aria-label="Закрити" className="size-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></button>
            </div>
            <div className="overflow-y-auto px-4 pb-2">{rightPanel}</div>
            <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] space-y-2">
              <button type="button" onClick={() => { setMobilePriceOpen(false); setAiDrawerOpen(true); }}
                disabled={layers.length === 0}
                className="w-full flex items-center gap-3 h-12 px-4 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/40">
                <MirrorRound className="size-5 text-primary shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground leading-tight">Приміряти на людину</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">З допомогою AI</p>
                </div>
              </button>
              {addDisabledReason && !addingToCart && (
                <p className="text-xs text-destructive/80 text-center">{addDisabledReason}</p>
              )}
              <Button type="button" className="w-full h-11 text-sm font-semibold cursor-pointer"
                onClick={() => { setMobilePriceOpen(false); void handleAddToCart(); }}
                disabled={addingToCart || !!addDisabledReason}>
                {addingToCart ? <><Loader2 className="size-3.5 animate-spin mr-1.5" /> Додаємо...</> : "Додати до замовлення"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addingToCart && (
        <div className="fixed inset-0 z-[10001] bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-xl text-sm font-semibold">
            <Loader2 className="size-4 animate-spin text-primary" /> Додаємо...
          </div>
        </div>
      )}

      {/* GenerationDrawer — portal-level overlay */}
      <GenerationDrawer
        open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)}
        addLayer={addLayerForAI} activeSide={activeSide} printPricing={printPricing}
        captureRef={captureRef} layers={layers} mockups={mockups}
        selectedColor={selectedColor} productImages={productImages} productName={product.name}
      />
    </div>
  );

  return mounted ? createPortal(content, document.body) : null;
}

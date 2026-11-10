"use client";

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { PrintLayer, SidebarTabId } from "@udo-craft/shared";
import type { Product, PrintZone, Material, ProductColorVariant } from "@udo-craft/shared";
import { QtyPriceContent } from "./QtyPriceContent";
import { CustomizerLayout } from "./CustomizerLayout";
import { CustomizerCanvas } from "./CustomizerCanvas";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, MessageSquare, MirrorRound, Save, Share2, X } from "lucide-react";
import { useCustomizerState } from "./useCustomizerState";
import { GenerationDrawer } from "./GenerationDrawer";
import EditorSidebar from "./editor/EditorSidebar";
import PrintsPanel from "./editor/PrintsPanel";
import DrawPanel from "./editor/DrawPanel";
import TextPanel from "./editor/TextPanel";
import UploadPanel from "./editor/UploadPanel";
import MobileSheet from "./editor/MobileSheet";
import type { TextLayerPatch } from "./editor/TextPanel";
import LayersList from "@/components/LayersList";
import type { TextComposition } from "@udo-craft/shared";
import { useLayersBadge } from "@/hooks/useLayersBadge";
import type { AiQuotaState } from "@/hooks/useAiQuota";
import { PaywallModal } from "@/components/PaywallModal";
import { AuthModal } from "@/components/AuthModal";
import { cancelRemoveBg } from "@/lib/remove-bg-client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomizerShareComment, LoadedCustomizerShare, ShareAccess } from "../_lib/customizerShare";
import { buildSharePayload } from "../_lib/customizerShare";
import { isLightSwatch } from "@/lib/canvas-colors";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

interface SizeChart {
  id: string;
  name: string;
  rows: Record<string, string>[];
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  unitPriceCents: number;
  printCostCents: number;
  quantity: number;
  size: string;
  color: string;
  itemNote?: string;
  layers?: PrintLayer[];
  mockupDataUrl?: string;
  mockupUploadedUrl?: string;
  mockupBackDataUrl?: string;
  mockupsMap?: Record<string, string>;
  offsetTopMm?: number;
  printZone?: PrintZone | null;
  cartItemId?: string;
}

export interface CustomizerProps {
  product: ProductWithConfig;
  printZones: { front?: PrintZone | null; back?: PrintZone | null };
  sizeChart?: SizeChart | null;
  materials: Material[];
  variants: ProductColorVariant[];
  onAdd: (item: CartItem) => void;
  onClose: () => void;
  initialSize?: string;
  initialColor?: string;
  initialLayers?: PrintLayer[];
  autoOpenCanvas?: boolean;
  existingMockupUploadedUrl?: string;
  initialShare?: LoadedCustomizerShare;
  cartItemId?: string;
  isAuthenticated: boolean;
  aiQuota: AiQuotaState;
  onAuthSuccess?: () => void;
}

export function Customizer({
  product,
  printZones,
  sizeChart,
  materials,
  variants,
  onAdd,
  onClose,
  initialSize,
  initialColor,
  initialLayers,
  existingMockupUploadedUrl,
  initialShare,
  cartItemId,
  isAuthenticated,
  aiQuota,
  onAuthSuccess,
}: CustomizerProps) {
  const s = useCustomizerState({
    product, printZones, materials, variants, 
    onAdd: (item) => onAdd({ ...item, cartItemId }),
    initialSize, initialColor, initialLayers, existingMockupUploadedUrl,
    initialSharePayload: initialShare?.payload,
  });

  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [mobilePriceOpen, setMobilePriceOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const tShare = useTranslations("share");
  const [shareOpen, setShareOpen] = useState(false);
  const [drawingEditLayerId, setDrawingEditLayerId] = useState<string | null>(null);
  const [shareAccess, setShareAccess] = useState<ShareAccess>(initialShare?.access ?? "comment");
  const [shareUrl, setShareUrl] = useState(initialShare && typeof window !== "undefined" ? `${window.location.origin}/order?share=${initialShare.token}` : "");
  const [shareToken, setShareToken] = useState<string | null>(initialShare?.token ?? null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareAuthOpen, setShareAuthOpen] = useState(false);
  const [comments, setComments] = useState<CustomizerShareComment[]>(initialShare?.comments ?? []);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const isSharedSession = Boolean(initialShare);
  const canEditShare = !initialShare || initialShare.access === "edit";
  const canCommentShare = initialShare?.access === "comment" || initialShare?.access === "edit";
  const isReadOnly = isSharedSession && (!canEditShare || !isAuthenticated);
  const currentPayload = useMemo(() => buildSharePayload({
    productId: product.id,
    selectedColor: s.selectedColor,
    selectedSize: s.selectedSize,
    quantity: s.quantity,
    itemNote: s.itemNote,
    activeSide: s.activeSide,
    layers: s.layers,
  }), [product.id, s.selectedColor, s.selectedSize, s.quantity, s.itemNote, s.activeSide, s.layers]);

  const copyShareUrl = async (url = shareUrl) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Safari refuses clipboard writes that are not directly inside a tap; the Copy button still works.
    }
  };

  /** Create the link (first time) or save the current design / access to it. Returns the URL. */
  const saveShare = async (access: ShareAccess): Promise<string | null> => {
    setShareLoading(true);
    try {
      const res = await fetch(shareToken ? `/api/customizer-shares/${shareToken}` : "/api/customizer-shares", {
        method: shareToken ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, access, payload: currentPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const url = data.url ?? `${window.location.origin}/order?share=${data.token}`;
      setShareToken(data.token);
      setShareUrl(url);
      return url;
    } catch {
      toast.error(tShare("error"));
      return null;
    } finally {
      setShareLoading(false);
    }
  };

  /** One tap: sign-in if needed, then the link is created and copied before any option is asked. */
  const openShare = async () => {
    if (isSharedSession) { setShareOpen(true); return; }
    if (!isAuthenticated) { setShareAuthOpen(true); return; }
    setShareOpen(true);
    if (!shareUrl) await copyShareUrl((await saveShare(shareAccess)) ?? "");
  };

  const changeAccess = (access: ShareAccess) => {
    setShareAccess(access);
    if (shareToken) void saveShare(access);
  };

  const updateShare = async () => {
    if (await saveShare(shareAccess)) toast.success(tShare("updated"));
  };

  const nativeShare = () => void navigator.share?.({ title: product.name, url: shareUrl }).catch(() => {});

  const postComment = async () => {
    if (!initialShare || !commentDraft.trim()) return;
    if (!isAuthenticated) {
      setShareOpen(false);
      setShareAuthOpen(true);
      return;
    }
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/customizer-shares/${initialShare.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не вдалося додати коментар");
      setComments((prev) => [...prev, data]);
      setCommentDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tShare("error"));
    } finally {
      setCommentLoading(false);
    }
  };

  // Tab title badge — shows layer count
  useLayersBadge(s.layers.length, `${product.name} — U:DO CRAFT`);

  const productImages: Record<string, string> =
    (s.selectedVariant?.images && Object.keys(s.selectedVariant.images).length > 0
      ? s.selectedVariant.images
      : product.images ?? {}) as Record<string, string>;

  if (!s.mounted) return null;

  const handleClose = () => {
    if (s.layers.length > 0) {
      if (!confirm("Повернутися? Незбережені зміни буде втрачено.")) return;
    }
    onClose();
  };

  const addLayer = (file: File) => {
    if (isReadOnly) return;
    s.addLayer(file);
    s.setActiveTab("layers");
  };
  const addTextLayer = () => {
    if (isReadOnly) return;
    s.addTextLayer();
    s.setActiveTab("layers");
  };

  const handleAddComposition = (composition: TextComposition) => {
    const now = Date.now();
    const placeholder = new File([], "text-layer.txt", { type: "text/plain" });
    const minSizeRow = s.printPricing
      .filter((r) => r.print_type === "dtf")
      .sort((a, b) => (a.size_min_cm + a.size_max_cm) / 2 - (b.size_min_cm + b.size_max_cm) / 2)[0];
    const base = {
      file: placeholder, url: "", type: "dtf" as const, side: s.activeSide,
      kind: "text" as const,
      sizeLabel: minSizeRow?.size_label, sizeMinCm: minSizeRow?.size_min_cm, sizeMaxCm: minSizeRow?.size_max_cm,
    };
    const comboId = `text-combo-${now}`;
    const newLayers = composition.layers.map((cl, i) => ({
      ...base,
      id: `text-${now}-${i}`,
      comboId,
      isComboChild: i > 0,
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
    s.setLayersWithRef((prev) => [...prev, ...newLayers]);
    s.setActiveLayerId(newLayers[0].id);
    s.setActiveTab("layers");
  };

  const selectedLayer = s.layers.find((l) => l.id === s.activeLayerId) ?? null;

  // ── Shared layer handler props ────────────────────────────────────────

  const layerHandlerProps = {
    layers: s.layers,
    activeSide: s.activeSide,
    activeLayerId: s.activeLayerId,
    onSelect: s.setActiveLayerId,
    onDelete: s.handleDelete,
    onDuplicate: s.duplicateLayer,
    onReorder: (layers: PrintLayer[]) => s.setLayersWithRef(layers),
    onTypeChange: s.handleTypeChange,
    onSizeLabelChange: s.handleSizeLabelChange,
    onTextChange: (id: string, patch: TextLayerPatch) => s.handleTextChange(id, patch),
    pricing: s.printPricing,
    quantity: s.quantity,
    layerScales: s.layerScales,
    pxToMmRatio: product.px_to_mm_ratio || 0,
  };

  // ── Panel content helper ──────────────────────────────────────────────

  const panelContent = (tab: SidebarTabId | null) => {
    if (!tab) return null;
    if (isReadOnly) {
      return (
        <div className="p-4 space-y-3">
          <p className="text-sm font-medium">Перегляд макета</p>
          <p className="text-xs text-muted-foreground">
            {canEditShare && !isAuthenticated
              ? "Увійдіть в акаунт, щоб редагувати цей макет."
              : `Це посилання дозволяє перегляд${canCommentShare ? " і коментування" : ""}. Редагування вимкнено власником.`}
          </p>
          {canEditShare && !isAuthenticated && <Button type="button" variant="outline" size="sm" onClick={() => setPaywallOpen(true)}>Увійти для редагування</Button>}
          {canCommentShare && <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)}><MessageSquare className="size-4" /> Коментарі</Button>}
        </div>
      );
    }
    if (tab === "prints") return <PrintsPanel activeSide={s.activeSide} printPricing={s.printPricing} onAddLayer={addLayer} isAuthenticated={isAuthenticated} aiQuota={aiQuota} onPaywall={() => setPaywallOpen(true)} />;
    if (tab === "draw") return (
      <DrawPanel
        fabricCanvasRef={s.fabricCanvasRef}
        layers={s.layers} activeSide={s.activeSide} activeLayerId={s.activeLayerId}
        onAddLayer={addLayer}
        onReplaceDrawLayer={(id, file) => s.setLayersWithRef((prev) => prev.map((l) => {
          if (l.id !== id) return l;
          return { ...l, file, kind: "drawing", url: URL.createObjectURL(file), uploadedUrl: undefined };
        }))}
        setLayersWithRef={s.setLayersWithRef}
        printZoneBounds={{ left: 0, top: 0, width: 0, height: 0 }}
        editRequestLayerId={drawingEditLayerId}
        onEditRequestHandled={() => setDrawingEditLayerId(null)}
        garmentImageUrl={productImages[s.activeSide] ?? Object.values(productImages)[0] ?? null}
      />
    );
    if (tab === "text") return (
      <TextPanel
        onAddTextLayer={addTextLayer}
        onAddComposition={handleAddComposition}
      />
    );
    if (tab === "upload") return <UploadPanel activeSide={s.activeSide} onFileAdd={addLayer} />;
    if (tab === "layers") return (
      <div className="p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Шари</p>
        {s.layers.filter((l) => l.side === s.activeSide).length === 0 ? (
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

  // ── Sidebar (desktop icon strip) ─────────────────────────────────────

  const sidebar = <EditorSidebar activeTab={s.activeTab} onTabChange={s.setActiveTab} onBack={handleClose} layerCount={s.layers.length} />;

  // ── Animated panel column (desktop) ──────────────────────────────────

  const panel = (
    <motion.div
      animate={{ width: s.activeTab ? 280 : 0, opacity: s.activeTab ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="overflow-hidden border-r border-border bg-card h-full"
      style={{ minWidth: 0 } as React.CSSProperties}
    >
      <div className="w-[280px] h-full overflow-y-auto">
        {panelContent(s.activeTab)}
      </div>
    </motion.div>
  );

  // ── Right panel ───────────────────────────────────────────────────────

  // Product thumbnail for the info card
  const productThumb = (s.selectedVariant?.images && Object.keys(s.selectedVariant.images).length > 0
    ? Object.values(s.selectedVariant.images as Record<string, string>)[0]
    : Object.values(product.images ?? {})[0]) ?? "";

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
        onClick={handleClose}
        className="shrink-0 text-xs font-medium text-primary hover:underline focus-visible:outline-none whitespace-nowrap"
      >
        Змінити
      </button>
    </div>
  );

  const rightPanel = (
    <>
      {productInfoCard}
      {/* Color picker */}
      {variants.length > 0 && (
        <div className="space-y-1.5 pb-3 mb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Колір</p>
          <div className="flex gap-2 flex-wrap">
            {variants.map((v) => {
              const mat = materials.find((m) => m.id === v.material_id);
              if (!mat) return null;
              const isSelected = s.selectedVariant?.id === v.id;
              const isWhite = isLightSwatch(mat.hex_code);
              return (
                <button key={v.id} onClick={() => { if (!isReadOnly) { s.setSelectedColor(mat.name); s.setSelectedVariant(v); } }}
                  title={mat.name} aria-label={mat.name} aria-pressed={isSelected}
                  className={`relative size-7 rounded-full transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"} ${isWhite ? "border border-border" : ""}`}
                  style={{ backgroundColor: mat.hex_code }}>
                  {isSelected && <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: isWhite ? "var(--foreground)" : "var(--primary-foreground)" }}>✓</span>}
                </button>
              );
            })}
          </div>
          {s.selectedColor && <p className="text-xs text-muted-foreground">{s.selectedColor}</p>}
        </div>
      )}
      {/* Size picker */}
      {Array.isArray(product.available_sizes) && (product.available_sizes as string[]).length > 0 && (
        <div className="space-y-1.5 pb-3 mb-3 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Розмір</p>
          <div className="flex gap-1.5 flex-wrap">
            {(product.available_sizes as string[]).map((size) => (
              <button key={size} onClick={() => { if (!isReadOnly) s.setSelectedSize(size); }} aria-pressed={s.selectedSize === size}
                className={`min-w-[36px] h-9 px-2 rounded-lg text-sm font-semibold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${s.selectedSize === size ? "bg-foreground text-background border-foreground shadow-sm" : "border-border hover:border-foreground/40 hover:bg-muted/50"}`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
      <QtyPriceContent
      product={product as any}
      quantity={s.quantity}
      qtyStr={s.qtyStr}
      setQuantity={s.setQuantity}
      setQtyStr={s.setQtyStr}
      discountPct={s.discountPct}
      unitPrice={s.unitPrice}
      discounted={s.discounted}
      printCostPerUnit={s.printCostPerUnit}
      total={s.total}
      layers={s.layers}
      pricing={s.printPricing}
      itemNote={s.itemNote}
      setItemNote={s.setItemNote}
      onAddToCart={() => void s.handleAddToCart()}
      loading={s.addingToCart || s.removingBg}
      showTitle={false}
      addDisabled={!!s.addDisabledReason || s.removingBg}
      addDisabledReason={s.addDisabledReason || (s.removingBg ? "Видаляємо фон..." : null)}
      disabled={s.removingBg || isReadOnly}
      hideButton
    />
    </>
  );

  const stickyButton = (
    <div className="space-y-2">
      {/* AI try-on button */}
      <button
        type="button"
        disabled={s.layers.length === 0}
        onClick={() => {
          if (!isAuthenticated) { setPaywallOpen(true); return; }
          setAiDrawerOpen(true);
        }}
        className="w-full flex items-center gap-3 h-12 px-4 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-muted/40"
      >
        <MirrorRound className="size-5 text-primary shrink-0" aria-hidden="true" />
        <div className="text-left">
          <p className="text-sm font-medium text-foreground leading-tight">Приміряти на людину</p>
          <p className="text-xs text-muted-foreground leading-tight">З допомогою AI</p>
        </div>
      </button>

      {(s.addDisabledReason && !s.addingToCart && !s.removingBg) && (
        <p className="text-xs text-destructive text-center">{s.addDisabledReason}</p>
      )}
      {!isReadOnly && <Button
        className="w-full h-11 text-sm font-semibold"
        disabled={s.addingToCart || s.removingBg || !!s.addDisabledReason}
        onClick={() => void s.handleAddToCart()}
      >
        {(s.addingToCart || s.removingBg)
          ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />{s.removingBg ? "Видаляємо фон..." : "Додаємо..."}</>
          : "Додати до замовлення"}
      </Button>}
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 text-sm font-semibold"
        onClick={() => void openShare()}
      >
        <Share2 className="size-4" /> {isSharedSession ? tShare("accessTitle") : tShare("title")}
      </Button>
    </div>
  );

  // ── Canvas ────────────────────────────────────────────────────────────

  const canvas = (
    <CustomizerCanvas
      product={product}
      printZones={printZones}
      layers={s.layers}
      activeSide={s.activeSide}
      activeLayerId={s.activeLayerId}
      selectedVariantImages={
        s.selectedVariant?.images && Object.keys(s.selectedVariant.images).length > 0
          ? s.selectedVariant.images as Record<string, string>
          : undefined
      }
      canvasSaveRef={s.canvasSaveRef}
      captureRef={s.captureRef}
      fabricCanvasRef={s.fabricCanvasRef}
      onSideChange={(side) => {
        const imgs = s.selectedVariant?.images && Object.keys(s.selectedVariant.images).length > 0
          ? s.selectedVariant.images : product.images ?? {};
        if (!(imgs as Record<string, string>)[side]) return;
        s.setActiveSide(side);
      }}
      onSave={(dataUrl, side, mm) => { s.setMockups((prev) => ({ ...prev, [side]: dataUrl })); s.setOffsetTopMm(mm); }}
      onOffsetChange={s.setOffsetTopMm}
      onLayerSelect={s.setActiveLayerId}
      onRemoveBg={s.handleRemoveBg}
      onRemoveBgStateChange={s.setRemovingBg}
      onLayerDelete={s.handleDelete}
      onLayerDuplicate={(layer) => { s.setLayersWithHistory((prev) => [...prev, layer]); s.setActiveLayerId(layer.id); }}
      onLayerTransformChange={(id, transform) => {
        s.setLayerScales((prev) => ({ ...prev, [id]: transform.scaleX }));
        s.setLayersWithHistory((prev) => prev.map((l) => l.id === id ? { ...l, transform: transform as PrintLayer["transform"] } : l));
      }}
      onTextChange={s.handleTextChange}
      onLayerPatch={(id, patch) => s.handleTextChange(id, patch as any)}
      onUndo={s.handleUndo}
      onRedo={s.handleRedo}
      canUndo={s.canUndo}
      canRedo={s.canRedo}
      onOpenDrawingStudio={(layerId) => {
        s.setActiveLayerId(layerId);
        s.setActiveTab("draw");
        setDrawingEditLayerId(layerId);
      }}
      readOnly={isReadOnly}
    />
  );

  return createPortal(
    <>
      <CustomizerLayout
        productName={product.name}
        total={s.total}
        mobileSheet={s.mobileSheet}
        setMobileSheet={s.setMobileSheet}
        addingToCart={s.addingToCart}
        removingBg={s.removingBg}
        onCancelRemoveBg={() => { cancelRemoveBg(); s.setRemovingBg(false); }}
        sidebar={sidebar}
        panel={panel}
        activeTab={s.activeTab}
        onTabChange={(tab) => { setMobilePriceOpen(false); s.setActiveTab(tab); }}
        onPriceOpen={() => { s.setActiveTab(null); setMobilePriceOpen(true); }}
        canvas={canvas}
        rightPanel={rightPanel}
        stickyButton={stickyButton}
        onClose={onClose}
        layerCount={s.layers.length}
        mobileTabSheet={
          <MobileSheet
            open={!!s.activeTab && !mobilePriceOpen}
            onClose={() => s.setActiveTab(null)}
            title={tabLabel(s.activeTab)}
          >
            <div className="p-4">{panelContent(s.activeTab)}</div>
          </MobileSheet>
        }
        mobilePriceSheet={mobilePriceOpen ? (
          <div className="fixed inset-x-0 top-0 bottom-14 z-[9994] flex flex-col justify-end" onClick={() => setMobilePriceOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-background border-t border-border flex flex-col" style={{ maxHeight: "calc(100dvh - 56px - 44px)" }} onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-center pt-2.5 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="flex items-center justify-between px-4 pb-3 shrink-0">
                <p className="text-sm font-semibold">Тираж та ціна</p>
                <button onClick={() => setMobilePriceOpen(false)} aria-label="Закрити" className="size-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="size-4" /></button>
              </div>
              <div className="overflow-y-auto px-4 pb-2">{rightPanel}</div>
              <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                {stickyButton}
              </div>
            </div>
          </div>
        ) : null}
      />

      {/* GenerationDrawer — rendered at portal level so it overlays everything */}
      <GenerationDrawer
        open={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        addLayer={(file, side, pricing) => s.addLayerFull(file, side, pricing)}
        activeSide={s.activeSide}
        printPricing={s.printPricing}
        captureRef={s.captureRef}
        layers={s.layers}
        mockups={s.mockups}
        selectedColor={s.selectedColor}
        productImages={productImages}
        productName={product.name}
        aiQuota={aiQuota}
      />

      {/* PaywallModal — shown when unauthenticated user clicks an AI feature */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} onAuthSuccess={onAuthSuccess} />
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[92svh] max-w-none translate-x-0 translate-y-0 gap-5 overflow-y-auto rounded-b-none rounded-t-2xl p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <DialogHeader className="pr-8">
            <DialogTitle>{isSharedSession ? tShare("accessTitle") : tShare("title")}</DialogTitle>
            <DialogDescription className="sr-only">{tShare("viewHint")}</DialogDescription>
          </DialogHeader>

          {(!isSharedSession || (canEditShare && isAuthenticated)) && (
            <div className="space-y-4">
              {shareUrl ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly aria-label={tShare("title")} onFocus={(e) => e.target.select()} className="min-w-0 flex-1" />
                    <Button type="button" variant="primary" className="shrink-0" onClick={() => void copyShareUrl()}>
                      {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                      {copied ? tShare("copied") : tShare("copy")}
                    </Button>
                  </div>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <Button type="button" variant="outline" className="w-full" onClick={nativeShare}>
                      <Share2 className="size-4" aria-hidden="true" /> {tShare("send")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground" role="status">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {tShare("creating")}
                </div>
              )}

              <fieldset disabled={shareLoading} className="space-y-2">
                <legend className="mb-2 text-sm font-medium">{tShare("accessLabel")}</legend>
                {(["comment", "edit"] as const).map((access) => (
                  <label key={access} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors duration-fast has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${shareAccess === access ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name="share-access" className="peer sr-only" checked={shareAccess === access} onChange={() => changeAccess(access)} />
                    <span className="size-5 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] duration-fast peer-checked:border-[6px] peer-checked:border-primary" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{tShare(access === "edit" ? "edit" : "view")}</span>
                      <span className="block text-sm text-muted-foreground">{tShare(access === "edit" ? "editHint" : "viewHint")}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {shareUrl && (
                <button type="button" onClick={() => void updateShare()} disabled={shareLoading}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {shareLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />} {tShare("update")}
                </button>
              )}
            </div>
          )}

          {isSharedSession && (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">{tShare("comments")}</p>
              <div className="max-h-44 space-y-2 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tShare("noComments")}</p>
                ) : comments.map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{comment.author_label}</p>
                    <p className="text-sm">{comment.body}</p>
                  </div>
                ))}
              </div>
              {canCommentShare ? (
                <div className="space-y-2">
                  <Textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder={tShare("addComment")} aria-label={tShare("addComment")} />
                  <Button type="button" onClick={postComment} disabled={commentLoading || !commentDraft.trim()}>
                    {commentLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <MessageSquare className="size-4" aria-hidden="true" />} {tShare("sendComment")}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tShare("commentsOff")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AuthModal
        open={shareAuthOpen}
        onClose={() => setShareAuthOpen(false)}
        initialScreen="login"
        onAuthSuccess={() => {
          setShareAuthOpen(false);
          onAuthSuccess?.();
          // Signed in from the share button: carry on and create the link.
          if (!isSharedSession) { setShareOpen(true); void saveShare(shareAccess).then((url) => copyShareUrl(url ?? "")); }
          else setShareOpen(true);
        }}
      />
    </>,
    document.body
  );
}

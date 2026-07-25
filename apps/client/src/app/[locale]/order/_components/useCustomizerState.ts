"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCustomizer, type PrintLayer, type SidebarTabId } from "@udo-craft/shared";
import type { Product, PrintZone, Material, ProductColorVariant } from "@udo-craft/shared";
import { type PrintTypePricingRow } from "@/components/LayersPanel";
import { toast } from "sonner";
import { useLayerHandlers } from "./useLayerHandlers";
import type { CartItem } from "./Customizer";
import { useCustomizerDraft } from "./useCustomizerDraft";
import type { CustomizerSharePayload } from "../_lib/customizerShare";
import { hydrateSharePayload } from "../_lib/customizerShare";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

interface UseCustomizerStateProps {
  product: ProductWithConfig;
  printZones: { front?: PrintZone | null; back?: PrintZone | null };
  materials: Material[];
  variants: ProductColorVariant[];
  onAdd: (item: CartItem) => void;
  initialSize?: string;
  initialColor?: string;
  initialLayers?: PrintLayer[];
  existingMockupUploadedUrl?: string;
  initialSharePayload?: CustomizerSharePayload;
}

export function useCustomizerState({
  product,
  printZones,
  materials,
  variants,
  onAdd,
  initialSize,
  initialColor,
  initialLayers,
  existingMockupUploadedUrl,
  initialSharePayload,
}: UseCustomizerStateProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasSaveRef = useRef<(() => string) | null>(null);
  const fabricCanvasRef = useRef<import("fabric").fabric.Canvas | null>(null);
  const [mobileSheet, setMobileSheet] = useState<"config" | "price" | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTabId | null>(null);
  const [mounted, setMounted] = useState(false);

  // ── Undo/redo history ─────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<PrintLayer[][]>([]);
  const [redoStack, setRedoStack] = useState<PrintLayer[][]>([]);
  const undoStackRef = useRef<PrintLayer[][]>([]);
  const redoStackRef = useRef<PrintLayer[][]>([]);

  const {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    mockups,
    setMockups,
    layersRef,
    captureRef,
    setLayersWithRef,
    addLayer: addLayerFromHook,
    addTextLayer: addTextLayerFromHook,
    resolveLayerPrice: resolveLayerPriceFromHook,
    handleAddToCart: handleAddToCartFromHook,
  } = useCustomizer({ uploadUrl: "/api/upload", uploadResponseKey: "urls[0]" });

  void setLayers;

  const defaultColor = variants[0]
    ? (materials.find((m) => m.id === variants[0].material_id)?.name ?? "black")
    : "black";

  // ── Draft persistence ─────────────────────────────────────────────────
  const { loadDraft, saveDraft, clearDraft } = useCustomizerDraft(product.id);
  const draft = useRef(loadDraft()).current; // load once synchronously before state init
  const sharedDraft = useRef(initialSharePayload ? hydrateSharePayload(initialSharePayload) : null).current;

  const [selectedSize, setSelectedSize] = useState(initialSize ?? sharedDraft?.selectedSize ?? draft?.selectedSize ?? "");
  const [selectedColor, setSelectedColor] = useState(initialColor ?? sharedDraft?.selectedColor ?? draft?.selectedColor ?? defaultColor);
  const initialVariant = (() => {
    const colorToMatch = initialColor ?? sharedDraft?.selectedColor ?? draft?.selectedColor;
    return colorToMatch
      ? (variants.find((v) => materials.find((m) => m.id === v.material_id)?.name === colorToMatch) ?? variants[0] ?? null)
      : (variants[0] ?? null);
  })();
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [quantity, setQuantity] = useState(sharedDraft?.quantity ?? draft?.quantity ?? 1);
  const [qtyStr, setQtyStr] = useState(String(sharedDraft?.quantity ?? draft?.quantity ?? 1));
  const [activeSide, setActiveSide] = useState<string>(() => {
    if (sharedDraft?.activeSide) return sharedDraft.activeSide;
    if (draft?.activeSide) return draft.activeSide;
    const imgs = (variants[0]?.images && Object.keys(variants[0].images).length > 0
      ? variants[0].images : product.images) as Record<string, string> ?? {};
    return (Object.keys(imgs)[0] ?? "front") as string;
  });
  const [offsetTopMm, setOffsetTopMm] = useState(0);
  const [itemNote, setItemNote] = useState(sharedDraft?.itemNote ?? draft?.itemNote ?? "");
  const [printPricing, setPrintPricing] = useState<PrintTypePricingRow[]>([]);
  const [layerScales, setLayerScales] = useState<Record<string, number>>({});
  const [removingBg, setRemovingBg] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetch("/api/print-type-pricing")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setPrintPricing(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (initialLayers && initialLayers.length > 0) {
      // Edit mode — cart item takes priority over any saved draft
      setLayersWithRef(initialLayers);
    } else if (sharedDraft?.layers && sharedDraft.layers.length > 0) {
      setLayersWithRef(sharedDraft.layers);
    } else if (draft?.layers && draft.layers.length > 0) {
      // Restore draft layers (only uploaded images + text layers survive reload)
      setLayersWithRef(draft.layers);
      toast.info("Відновлено попередній сеанс редагування", { duration: 3000 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    window.scrollTo({ top: 0, behavior: "auto" });
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  useEffect(() => {
    const images = selectedVariant?.images && Object.keys(selectedVariant.images).length > 0
      ? selectedVariant.images : product.images ?? {};
    const keys = Object.keys(images).filter((key) => (images as Record<string, string>)[key]);
    if (keys.length > 0 && !(images as Record<string, string>)[activeSide]) setActiveSide(keys[0]);
  }, [selectedVariant, product.images, activeSide]);

  // Derived pricing values
  const discountPct = (() => {
    const grid = (product as any).discount_grid as { qty: number; discount_pct: number }[] | undefined;
    if (!grid?.length) return 0;
    const sorted = [...grid].sort((a, b) => b.qty - a.qty);
    return sorted.find((t) => quantity >= t.qty)?.discount_pct ?? 0;
  })();
  const unitPrice = product.base_price_cents / 100;
  const discounted = unitPrice * (1 - discountPct / 100);
  const resolveLayerPrice = (layer: PrintLayer): number =>
    resolveLayerPriceFromHook(layer, quantity, printPricing);
  const printCostPerUnit = layers.reduce((sum, layer) => sum + resolveLayerPrice(layer) / 100, 0);
  const total = (discounted + printCostPerUnit) * quantity;
  const requiresGarmentSize = Array.isArray(product.available_sizes) && product.available_sizes.length > 0;
  const hasIncompletePrintSizes = layers.some((layer) => !layer.sizeLabel);
  const addDisabledReason = requiresGarmentSize && !selectedSize
    ? "Оберіть розмір товару."
    : hasIncompletePrintSizes ? "Оберіть розмір для кожного нанесення." : null;

  const addLayer = (file: File) => addLayerFromHook(file, activeSide, printPricing);
  const addLayerFull = (file: File, side: string, pricing: typeof printPricing) =>
    addLayerFromHook(file, side, pricing);
  const addTextLayer = () => addTextLayerFromHook(activeSide, printPricing);

  // ── History-aware setLayersWithRef ────────────────────────────────────
  const setLayersWithHistory = useCallback((updater: PrintLayer[] | ((prev: PrintLayer[]) => PrintLayer[])) => {
    // Snapshot current state before applying change
    const snapshot = layersRef.current;
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-50); // max 50 steps
    redoStackRef.current = [];
    setUndoStack(undoStackRef.current);
    setRedoStack([]);
    setLayersWithRef(updater);
  }, [layersRef, setLayersWithRef]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const stack = [...undoStackRef.current];
    const snapshot = stack.pop()!;
    redoStackRef.current = [...redoStackRef.current, layersRef.current];
    undoStackRef.current = stack;
    setUndoStack(stack);
    setRedoStack(redoStackRef.current);
    setLayersWithRef(snapshot);
  }, [layersRef, setLayersWithRef]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const stack = [...redoStackRef.current];
    const snapshot = stack.pop()!;
    undoStackRef.current = [...undoStackRef.current, layersRef.current];
    redoStackRef.current = stack;
    setUndoStack(undoStackRef.current);
    setRedoStack(stack);
    setLayersWithRef(snapshot);
  }, [layersRef, setLayersWithRef]);

  const layerHandlers = useLayerHandlers({
    activeLayerId, printPricing, quantity, setActiveLayerId, setLayersWithRef: setLayersWithHistory, layersRef,
  });

  // Paste handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) { const f = item.getAsFile(); if (f) { addLayer(f); return; } }
      }
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text) {
        const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i);
        if (svgMatch) {
          const blob = new Blob([svgMatch[0]], { type: "image/svg+xml" });
          addLayer(new File([blob], "pasted.svg", { type: "image/svg+xml" }));
        } else {
          const id = `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const placeholder = new File([], "text-layer.txt", { type: "text/plain" });
          const minSizeRow = printPricing.filter((r) => r.print_type === "dtf").sort((a, b) => (a.size_min_cm + a.size_max_cm) / 2 - (b.size_min_cm + b.size_max_cm) / 2)[0];
          const layer: PrintLayer = {
            id, file: placeholder, url: "", type: "dtf", side: activeSide, kind: "text", textContent: text, textFont: "Montserrat", textColor: "#000000", textFontSize: 48, sizeLabel: minSizeRow?.size_label, sizeMinCm: minSizeRow?.size_min_cm, sizeMaxCm: minSizeRow?.size_max_cm,
          };
          setLayersWithHistory((prev) => [...prev, layer]);
          setActiveLayerId(id);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSide, printPricing]);

  // Auto-capture mockup on side change
  useEffect(() => {
    const timer = setTimeout(() => {
      const dataUrl = captureRef.current?.() ?? "";
      if (dataUrl.startsWith("data:image")) setMockups((prev) => ({ ...prev, [activeSide]: dataUrl }));
    }, 300);
    return () => clearTimeout(timer);
  }, [activeSide]);

  // ── Persist draft on every meaningful state change ────────────────────
  useEffect(() => {
    if (!mounted) return;
    saveDraft({ selectedColor, selectedSize, quantity, itemNote, activeSide, layers });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, selectedColor, selectedSize, quantity, itemNote, activeSide, mounted]);

  const handleAddToCart = async () => {
    if (addingToCart) return;
    if (requiresGarmentSize && !selectedSize) { toast.error("Оберіть розмір товару"); return; }
    if (hasIncompletePrintSizes) { toast.error("Оберіть розмір для кожного нанесення"); return; }
    setAddingToCart(true);
    try {
      const item = await handleAddToCartFromHook({
        activeSide, mockups, captureRef, layersRef, printPricing, quantity,
        discounted, printCostPerUnit, product, selectedSize, selectedColor,
        itemNote, offsetTopMm,
        printZone: printZones.front ?? printZones.back ?? null,
        requiresGarmentSize, hasIncompletePrintSizes,
        existingMockupUploadedUrl,
      });
      clearDraft();
      onAdd(item);
    } finally {
      setAddingToCart(false);
    }
  };

  return {
    // refs
    fileInputRef, canvasSaveRef, fabricCanvasRef, captureRef, layersRef,
    // state
    mounted, layers, activeLayerId, setActiveLayerId, mockups, setMockups,
    setLayersWithRef, setLayersWithHistory, mobileSheet, setMobileSheet, activeTab, setActiveTab,
    selectedSize, setSelectedSize, selectedColor, setSelectedColor,
    selectedVariant, setSelectedVariant,
    quantity, setQuantity, qtyStr, setQtyStr,
    activeSide, setActiveSide, offsetTopMm, setOffsetTopMm,
    itemNote, setItemNote, printPricing, layerScales, setLayerScales,
    removingBg, setRemovingBg, addingToCart,
    // derived
    discountPct, unitPrice, discounted, printCostPerUnit, total,
    requiresGarmentSize, hasIncompletePrintSizes, addDisabledReason,
    // actions
    addLayer, addLayerFull, addTextLayer, handleAddToCart, clearDraft, ...layerHandlers,
    handleUndo, handleRedo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}

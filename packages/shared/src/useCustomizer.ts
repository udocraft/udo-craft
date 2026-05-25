"use client";

import { useState, useRef, useCallback } from "react";
import type { PrintLayer } from "../index";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PrintTypePricingRow {
  id: string;
  print_type: string;
  size_label: string;
  size_min_cm: number;
  size_max_cm: number;
  qty_tiers: { min_qty: number; price_cents: number }[];
}

export interface UseCustomizerConfig {
  /** Upload endpoint, e.g. "/api/upload" */
  uploadUrl: string;
  /**
   * Dot-path used to extract the uploaded URL from the JSON response.
   * Client: "urls[0]"   → data?.urls?.[0]
   * Admin:  "results[0].url" → data?.results?.[0]?.url
   */
  uploadResponseKey: string;
  /** Optional tags field appended to FormData (e.g. "print" for admin) */
  uploadTags?: string;
}

// ── Helper: parse a dot/bracket path from a JSON object ───────────────────

export function getUploadUrl(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  // Tokenise: "results[0].url" → ["results", "0", "url"]
  const tokens = key.replace(/\[(\d+)\]/g, ".$1").split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = data;
  for (const token of tokens) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[token];
  }
  return typeof cur === "string" ? cur : undefined;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface UseCustomizerReturn {
  layers: PrintLayer[];
  setLayers: React.Dispatch<React.SetStateAction<PrintLayer[]>>;
  activeLayerId: string | null;
  setActiveLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  mockups: Record<string, string>;
  setMockups: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  layersRef: React.MutableRefObject<PrintLayer[]>;
  captureRef: React.MutableRefObject<(() => string) | null>;
  setLayersWithRef: (updater: PrintLayer[] | ((prev: PrintLayer[]) => PrintLayer[])) => void;
  addLayer: (file: File, activeSide: string, printPricing: PrintTypePricingRow[]) => void;
  addTextLayer: (activeSide: string, printPricing: PrintTypePricingRow[]) => void;
  resolveLayerPrice: (layer: PrintLayer, quantity: number, printPricing: PrintTypePricingRow[]) => number;
  handleAddToCart: (params: HandleAddToCartParams) => Promise<HandleAddToCartResult>;
}

export interface HandleAddToCartParams {
  activeSide: string;
  mockups: Record<string, string>;
  captureRef: React.MutableRefObject<(() => string) | null>;
  layersRef: React.MutableRefObject<PrintLayer[]>;
  printPricing: PrintTypePricingRow[];
  quantity: number;
  discounted: number;
  printCostPerUnit: number;
  product: {
    id: string;
    name: string;
    base_price_cents: number;
    images?: Record<string, string> | null;
    available_sizes?: string[];
  };
  selectedSize: string;
  selectedColor: string;
  itemNote: string;
  offsetTopMm: number;
  printZone?: import("../index").PrintZone | null;
  requiresGarmentSize: boolean;
  hasIncompletePrintSizes: boolean;
  /** Existing mockup URL from a previous cart item (edit mode) — skip re-upload if unchanged */
  existingMockupUploadedUrl?: string;
}

export interface HandleAddToCartResult {
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
  printZone?: import("../index").PrintZone | null;
}

export function useCustomizer(config: UseCustomizerConfig): UseCustomizerReturn {
  const { uploadUrl, uploadResponseKey, uploadTags } = config;

  const [layers, setLayers] = useState<PrintLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [mockups, setMockups] = useState<Record<string, string>>({});

  const layersRef = useRef<PrintLayer[]>([]);
  const captureRef = useRef<(() => string) | null>(null);

  // Keeps layersRef in sync with layers state
  const setLayersWithRef = useCallback(
    (updater: PrintLayer[] | ((prev: PrintLayer[]) => PrintLayer[])) => {
      setLayers((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        layersRef.current = next;
        return next;
      });
    },
    [],
  );

  // ── addLayer ─────────────────────────────────────────────────────────────

  const addLayer = useCallback(
    (file: File, activeSide: string, printPricing: PrintTypePricingRow[]) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Pre-select minimum size for dtf
      const minSizeRow = printPricing
        .filter((r) => r.print_type === "dtf")
        .sort(
          (a, b) =>
            (a.size_min_cm + a.size_max_cm) / 2 -
            (b.size_min_cm + b.size_max_cm) / 2,
        )[0];

      const layer: PrintLayer = {
        id,
        file,
        url: URL.createObjectURL(file),
        type: "dtf",
        side: activeSide,
        kind: file.name.startsWith("drawing-") ? "drawing" : "image",
        sizeLabel: minSizeRow?.size_label,
        sizeMinCm: minSizeRow?.size_min_cm,
        sizeMaxCm: minSizeRow?.size_max_cm,
      };

      setLayersWithRef((prev) => [...prev, layer]);
      setActiveLayerId(id);

      // Upload immediately
      const fd = new FormData();
      fd.append("files", file);
      if (uploadTags) fd.append("tags", uploadTags);

      fetch(uploadUrl, { method: "POST", body: fd })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const uploadedUrl = getUploadUrl(data, uploadResponseKey);
          if (uploadedUrl) {
            setLayersWithRef((prev) =>
              prev.map((l) => (l.id === id ? { ...l, uploadedUrl } : l)),
            );
          }
        })
        .catch(() => {});
    },
    [uploadUrl, uploadResponseKey, uploadTags, setLayersWithRef],
  );

  // ── addTextLayer ──────────────────────────────────────────────────────────

  const addTextLayer = useCallback(
    (activeSide: string, printPricing: PrintTypePricingRow[]) => {
      const id = `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const placeholder = new File([], "text-layer.txt", {
        type: "text/plain",
      });

      const minSizeRow = printPricing
        .filter((r) => r.print_type === "dtf")
        .sort(
          (a, b) =>
            (a.size_min_cm + a.size_max_cm) / 2 -
            (b.size_min_cm + b.size_max_cm) / 2,
        )[0];

      const layer: PrintLayer = {
        id,
        file: placeholder,
        url: "",
        type: "dtf",
        side: activeSide,
        kind: "text",
        textContent: "Текст",
        textFont: "Montserrat",
        textColor: "#000000",
        textFontSize: 48,
        sizeLabel: minSizeRow?.size_label,
        sizeMinCm: minSizeRow?.size_min_cm,
        sizeMaxCm: minSizeRow?.size_max_cm,
      };

      setLayersWithRef((prev) => [...prev, layer]);
      setActiveLayerId(id);
    },
    [setLayersWithRef],
  );

  // ── resolveLayerPrice ─────────────────────────────────────────────────────

  const resolveLayerPrice = useCallback(
    (
      layer: PrintLayer,
      quantity: number,
      printPricing: PrintTypePricingRow[],
    ): number => {
      if (layer.isComboChild) return 0;
      const rows = printPricing.filter((r) => r.print_type === layer.type);
      if (!rows.length) return 0;
      const sizeLabel = layer.sizeLabel;
      if (!sizeLabel) return 0;
      const row = rows.find((r) => r.size_label === sizeLabel) ?? null;
      if (!row) return 0;
      const sorted = [...row.qty_tiers].sort(
        (a, b) => b.min_qty - a.min_qty,
      );
      const tier =
        sorted.find((t) => quantity >= t.min_qty) ??
        sorted[sorted.length - 1];
      return tier?.price_cents ?? layer.priceCents ?? 0;
    },
    [],
  );

  // ── handleAddToCart ───────────────────────────────────────────────────────

  const handleAddToCart = useCallback(
    async (params: HandleAddToCartParams): Promise<HandleAddToCartResult> => {
      const {
        activeSide,
        mockups: currentMockups,
        captureRef: capRef,
        layersRef: lRef,
        printPricing,
        quantity,
        discounted,
        printCostPerUnit,
        product,
        selectedSize,
        selectedColor,
        itemNote,
        offsetTopMm,
        printZone,
        existingMockupUploadedUrl,
      } = params;

      // Wait for any pending layer uploads (up to 8s)
      // Skip wait entirely if all layers already have uploadedUrl (edit with no changes)
      const allUploaded = lRef.current.every((l) => l.kind === "text" || !!l.uploadedUrl);
      if (!allUploaded) {
        const deadline = Date.now() + 8000;
        while (
          lRef.current.some((l) => l.kind !== "text" && !l.uploadedUrl) &&
          Date.now() < deadline
        ) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      // Capture current side synchronously
      const currentCapture = capRef.current?.() ?? "";

      // Build mockupsMap: start from all previously auto-captured sides, add current
      const allMockups: Record<string, string> = { ...currentMockups };
      if (currentCapture.startsWith("data:image")) {
        allMockups[activeSide] = currentCapture;
      }

      // Primary mockup = front if available, else first captured
      const mockupDataUrl =
        allMockups.front || allMockups[Object.keys(allMockups)[0]] || "";
      const mockupBackDataUrl = allMockups.back;

      // Upload primary mockup to storage — skip if we already have one (edit with no changes)
      let mockupUploadedUrl: string | undefined = existingMockupUploadedUrl;
      if (!mockupUploadedUrl && mockupDataUrl) {
        try {
          const [header, b64] = mockupDataUrl.split(",");
          const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
          const binary = atob(b64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          const blob = new Blob([bytes], { type: mime });
          const fd = new FormData();
          fd.append(
            "files",
            new File([blob], "mockup.png", { type: "image/png" }),
          );
          // Use "mockup" tag for mockup uploads if uploadTags is set
          if (uploadTags) fd.append("tags", "mockup");
          const up = await fetch(uploadUrl, { method: "POST", body: fd });
          if (up.ok) {
            mockupUploadedUrl = getUploadUrl(await up.json(), uploadResponseKey);
          }
        } catch {
          // non-critical
        }
      }

      // Only include sides that actually have layers in the mockupsMap
      const sidesWithLayers = new Set(lRef.current.map((l) => l.side));
      const filteredMockups: Record<string, string> = {};
      for (const [side, url] of Object.entries(allMockups)) {
        if (sidesWithLayers.has(side) && (url.startsWith("data:image") || url.startsWith("http"))) {
          filteredMockups[side] = url;
        }
      }

      return {
        productId: product.id,
        productName: product.name,
        productImage: product.images?.front ?? "",
        productPrice: product.base_price_cents,
        unitPriceCents: Math.round(discounted * 100),
        printCostCents: Math.round(printCostPerUnit * 100),
        quantity,
        size: selectedSize,
        color: selectedColor,
        itemNote: itemNote.trim() || undefined,
        layers: lRef.current.map((l) => {
          const rows = printPricing.filter((r) => r.print_type === l.type);
          const sizeLabel = l.sizeLabel;
          const row = sizeLabel
            ? (rows.find((r) => r.size_label === sizeLabel) ?? null)
            : null;
          return {
            ...l,
            priceCents: l.priceCents ?? resolveLayerPrice(l, quantity, printPricing),
            sizeLabel,
            sizeMinCm: l.sizeMinCm ?? row?.size_min_cm,
            sizeMaxCm: l.sizeMaxCm ?? row?.size_max_cm,
          };
        }),
        mockupDataUrl: mockupDataUrl || undefined,
        mockupUploadedUrl,
        mockupBackDataUrl,
        mockupsMap:
          Object.keys(filteredMockups).length > 0
            ? filteredMockups
            : undefined,
        offsetTopMm,
        printZone,
      };
    },
    [uploadUrl, uploadResponseKey, uploadTags, resolveLayerPrice],
  );

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    mockups,
    setMockups,
    layersRef,
    captureRef,
    setLayersWithRef,
    addLayer,
    addTextLayer,
    resolveLayerPrice,
    handleAddToCart,
  };
}

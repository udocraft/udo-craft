"use client";

import type { PrintLayer } from "@udo-craft/shared";
import type { PrintTypePricingRow } from "@/components/LayersPanel";
import type { TextLayerPatch } from "./editor/TextPanel";

interface UseLayerHandlersParams {
  activeLayerId: string | null;
  printPricing: PrintTypePricingRow[];
  quantity: number;
  setActiveLayerId: (id: string | null) => void;
  setLayersWithRef: (updater: ((prev: PrintLayer[]) => PrintLayer[]) | PrintLayer[]) => void;
  layersRef: React.MutableRefObject<PrintLayer[]>;
}

export function useLayerHandlers({
  activeLayerId, printPricing, quantity,
  setActiveLayerId, setLayersWithRef, layersRef,
}: UseLayerHandlersParams) {
  const handleTextChange = (
    id: string,
    patch: TextLayerPatch & { svgFillColor?: string; svgStrokeColor?: string }
  ) => {
    // If SVG color changed, re-inject colors into the SVG blob
    if ((patch.svgFillColor !== undefined || patch.svgStrokeColor !== undefined)) {
      const layer = layersRef.current.find((l) => l.id === id);
      if (layer && (layer.url.includes(".svg") || layer.file?.type === "image/svg+xml")) {
        const srcUrl = layer.uploadedUrl ?? layer.url;
        if (srcUrl) {
          fetch(srcUrl)
            .then((r) => r.text())
            .then((svgText) => {
              const fillColor = patch.svgFillColor ?? layer.svgFillColor ?? "currentColor";
              const strokeColor = patch.svgStrokeColor ?? layer.svgStrokeColor ?? "";
              // Inject fill/stroke on the root <svg> element
              const modified = svgText
                .replace(/(<svg[^>]*?)(\s+fill="[^"]*")?(\s+stroke="[^"]*")?(\s*>)/,
                  (_, open, _fill, _stroke, close) => {
                    const fillAttr = fillColor && fillColor !== "transparent" ? ` fill="${fillColor}"` : ` fill="none"`;
                    const strokeAttr = strokeColor && strokeColor !== "transparent" ? ` stroke="${strokeColor}"` : "";
                    return `${open}${fillAttr}${strokeAttr}${close}`;
                  });
              const blob = new Blob([modified], { type: "image/svg+xml" });
              const newUrl = URL.createObjectURL(blob);
              const newFile = new File([blob], layer.file?.name ?? "shape.svg", { type: "image/svg+xml" });
              setLayersWithRef((prev) => prev.map((l) =>
                l.id === id ? { ...l, ...patch, url: newUrl, file: newFile, uploadedUrl: undefined } : l
              ));
            })
            .catch(() => {
              setLayersWithRef((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
            });
          return;
        }
      }
    }
    setLayersWithRef((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  };

  const duplicateLayer = (id: string) => {
    const src = layersRef.current.find((l) => l.id === id);
    if (!src) return;
    const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const copy: PrintLayer = { ...src, id: newId };
    setLayersWithRef((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setActiveLayerId(newId);
  };

  const handleRemoveBg = (id: string, newUrl: string) => {
    setLayersWithRef((prev) => prev.map((l) => l.id === id ? { ...l, url: newUrl, uploadedUrl: undefined } : l));
    fetch(newUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const fd = new FormData();
        fd.append("files", new File([blob], "print-nobg.png", { type: "image/png" }));
        return fetch("/api/upload", { method: "POST", body: fd });
      })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const uploadedUrl = data?.urls?.[0];
        if (uploadedUrl) setLayersWithRef((prev) => prev.map((l) => l.id === id ? { ...l, uploadedUrl } : l));
      })
      .catch(() => {});
  };

  const handleTypeChange = (id: string, type: string) => {
    setLayersWithRef((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      return { ...l, type: type as PrintLayer["type"], sizeLabel: undefined, sizeMinCm: undefined, sizeMaxCm: undefined, priceCents: undefined, transform: undefined };
    }));
  };

  const handleSizeLabelChange = (id: string, sizeLabel: string) => {
    setLayersWithRef((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const rows = printPricing.filter((r) => r.print_type === l.type);
      const row = rows.find((r) => r.size_label === sizeLabel) ?? rows[0];
      const sorted = row ? [...row.qty_tiers].sort((a, b) => b.min_qty - a.min_qty) : [];
      const tier = sorted.find((t) => quantity >= t.min_qty) ?? sorted[sorted.length - 1];
      return { ...l, sizeLabel, sizeMinCm: row?.size_min_cm, sizeMaxCm: row?.size_max_cm, priceCents: tier?.price_cents };
    }));
  };

  const handleDelete = (id: string) => {
    setLayersWithRef((prev) => prev.filter((l) => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(null);
  };

  return { handleTextChange, duplicateLayer, handleRemoveBg, handleTypeChange, handleSizeLabelChange, handleDelete };
}

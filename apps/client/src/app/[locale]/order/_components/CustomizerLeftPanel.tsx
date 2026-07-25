"use client";

import React, { useState } from "react";
import type { Product, Material, ProductColorVariant, PrintLayer } from "@udo-craft/shared";
import LayersPanel, { type PrintTypePricingRow } from "@/components/LayersPanel";
import { ArrowLeft, Check } from "lucide-react";
import type { TextLayerPatch } from "./editor/TextPanel";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

export interface CustomizerLeftPanelProps {
  product: ProductWithConfig;
  unitPrice: number;
  variants: ProductColorVariant[];
  materials: Material[];
  selectedVariant: ProductColorVariant | null;
  selectedColor: string;
  selectedSize: string;
  layers: PrintLayer[];
  activeSide: string;
  activeLayerId: string | null;
  printPricing: PrintTypePricingRow[];
  quantity: number;
  layerScales: Record<string, number>;
  removingBg: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  onColorSelect: (color: string, variant: ProductColorVariant) => void;
  onSizeSelect: (size: string) => void;
  onLayerSelect: (id: string | null) => void;
  onLayerDelete: (id: string) => void;
  onLayerDuplicate: (id: string) => void;
  onLayerRemoveBg: (id: string, newUrl: string) => void;
  onLayerTypeChange: (id: string, type: string) => void;
  onLayerSizeLabelChange: (id: string, sizeLabel: string) => void;
  onLayerReorder: (layers: PrintLayer[]) => void;
  onAddClick: () => void;
  onAddText: () => void;
  onTextChange: (id: string, patch: TextLayerPatch) => void;
  onFileChange: (file: File) => void;
}

export function CustomizerLeftPanel({
  product, unitPrice, variants, materials, selectedVariant, selectedColor, selectedSize,
  layers, activeSide, activeLayerId, printPricing, quantity, layerScales, removingBg,
  fileInputRef, onClose, onColorSelect, onSizeSelect, onLayerSelect, onLayerDelete,
  onLayerDuplicate, onLayerRemoveBg, onLayerTypeChange, onLayerSizeLabelChange,
  onLayerReorder, onAddClick, onAddText, onTextChange, onFileChange,
}: CustomizerLeftPanelProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => { if (!confirm("Повернутися? Незбережені зміни буде втрачено.")) return; onClose(); }}
          className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" /> Назад
        </button>
        <p className="text-sm font-bold leading-tight">{product.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2">від {unitPrice.toFixed(0)} ₴ / шт</p>
        
        {product.description && (
          <div className="mt-2">
            <p className={`text-xs text-muted-foreground ${descExpanded ? "" : "line-clamp-2"}`}>
              {product.description}
            </p>
            {product.description.length > 80 && (
              <button 
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-[11px] text-primary font-semibold hover:underline mt-1 touch-manipulation cursor-pointer"
              >
                {descExpanded ? "Згорнути" : "Розгорнути"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Колір</p>
        {variants.length > 0 ? (
          <div className="flex gap-2 flex-wrap">
            {variants.map((v) => {
              const mat = materials.find((m) => m.id === v.material_id);
              if (!mat) return null;
              const isSelected = selectedVariant?.id === v.id;
              const isWhite = mat.hex_code.toLowerCase() === "#ffffff" || mat.hex_code.toLowerCase() === "#f5f5f5";
              return (
                <button key={v.id} onClick={() => onColorSelect(mat.name, v)} title={mat.name}
                  className={`cursor-pointer relative size-8 rounded-full transition-all ${isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : "hover:scale-105"} ${isWhite ? "border border-border" : ""}`}
                  style={{ backgroundColor: mat.hex_code }}>
                  {isSelected && <Check className="absolute inset-0 m-auto size-3" style={{ color: isWhite ? "#1a1a1a" : "#fff" }} />}
                </button>
              );
            })}
          </div>
        ) : <p className="text-xs text-muted-foreground">Кольори не налаштовані</p>}
        {selectedColor && <p className="text-xs text-muted-foreground">{selectedColor}</p>}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Розмір</p>
        <div className="flex gap-1.5 flex-wrap">
          {(Array.isArray(product.available_sizes) && product.available_sizes.length > 0
            ? product.available_sizes as string[] : []
          ).map((size) => (
            <button key={size} onClick={() => onSizeSelect(size)}
              className={`cursor-pointer min-w-[38px] px-2 py-1.5 rounded-lg text-sm font-semibold border transition-all ${selectedSize === size ? "bg-foreground text-background border-foreground shadow-sm" : "border-border hover:border-foreground/40 hover:bg-muted/50"}`}>
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Нанесення</p>
        <LayersPanel
          layers={layers}
          activeSide={activeSide}
          activeLayerId={activeLayerId}
          onSelect={onLayerSelect}
          onDelete={onLayerDelete}
          onDuplicate={onLayerDuplicate}
          onTypeChange={onLayerTypeChange}
          onSizeLabelChange={onLayerSizeLabelChange}
          onReorder={onLayerReorder}
          onAddClick={onAddClick}
          onAddText={onAddText}
          onTextChange={onTextChange}
          fileInputRef={fileInputRef}
          onFileChange={onFileChange}
          pricing={printPricing}
          quantity={quantity}
          layerScales={layerScales}
          pxToMmRatio={product.px_to_mm_ratio || 0}
          disabled={removingBg}
        />
      </div>
    </div>
  );
}

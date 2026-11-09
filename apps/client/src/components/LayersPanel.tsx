"use client";

import React from "react";
import { ImagePlus, Type } from "lucide-react";
import LayersList from "./LayersList";
import type { LayersListProps } from "./LayersList";
export type { PrintTypePricingRow } from "./LayersList";

interface LayersPanelProps extends LayersListProps {
  onAddClick: () => void;
  onAddText?: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileChange: (file: File) => void;
}

export default function LayersPanel({
  onAddClick, onAddText, fileInputRef, onFileChange, disabled,
  ...listProps
}: LayersPanelProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onAddClick} disabled={disabled}
          className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card">
          <div className="size-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <ImagePlus className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">Зображення</span>
        </button>
        {onAddText ? (
          <button type="button" onClick={onAddText} disabled={disabled}
            className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 hover:bg-primary/5 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-card">
            <div className="size-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Type className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">Текст</span>
          </button>
        ) : (
          <div className="h-24 rounded-xl border-2 border-dashed border-border/30 bg-muted/20" />
        )}
      </div>
      <input ref={fileInputRef} type="file" accept=".png,.svg,.pdf,.jpg,.jpeg" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); e.target.value = ""; }} />

      <LayersList {...listProps} disabled={disabled} />
    </div>
  );
}

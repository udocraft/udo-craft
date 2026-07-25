"use client";

import React, { useState } from "react";
import { Search, Type } from "lucide-react";
import { TEXT_COMPOSITIONS, type TextComposition, type PrintLayer } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────

export type TextLayerPatch = Partial<
  Pick<
    PrintLayer,
    | "textContent"
    | "textFont"
    | "textColor"
    | "textFontSize"
    | "textAlign"
    | "textCurve"
    | "textTransform"
    | "textLetterSpacing"
    | "textLineHeight"
    | "textBold"
    | "textItalic"
    | "textOverflow"
    | "textBackgroundColor"
    | "textStrokeColor"
    | "textStrokeWidth"
    | "textBoxWidth"
    | "textBoxHeight"
    | "opacity"
    | "svgFillColor"
    | "svgStrokeColor"
  >
>;

export interface TextPanelProps {
  onAddTextLayer: () => void;
  onAddComposition: (c: TextComposition) => void;
}

// ── Main component ────────────────────────────────────────────────────────

export default function TextPanel({ onAddTextLayer, onAddComposition }: TextPanelProps) {
  const [search, setSearch] = useState("");
  const filtered = TEXT_COMPOSITIONS.filter(
    (c) => !search || c.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Пошук композицій…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Add text box button */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onAddTextLayer}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Type className="size-4" />
          Додати текстовий блок
        </button>
      </div>

      {/* Compositions grid */}
      <div className="px-3 pb-4 grid grid-cols-2 gap-2">
        {filtered.map((comp) => (
          <button
            key={comp.id}
            type="button"
            onClick={() => onAddComposition(comp)}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-muted/30 hover:border-primary hover:bg-primary/5 transition-all p-3 min-h-[80px] text-center"
          >
            {/* Visual preview — CSS only */}
            <span
              style={{
                fontFamily: comp.layers[0].textFont,
                fontSize: Math.min(comp.layers[0].textFontSize / 3, 18),
                fontWeight: comp.layers[0].textBold ? 700 : 400,
                fontStyle: comp.layers[0].textItalic ? "italic" : "normal",
                color: comp.layers[0].textColor,
                lineHeight: 1.2,
              }}
              className="truncate w-full"
            >
              {comp.layers[0].textContent}
            </span>
            {comp.layers[1] && (
              <span
                style={{
                  fontFamily: comp.layers[1].textFont,
                  fontSize: Math.min(comp.layers[1].textFontSize / 4, 12),
                  color: comp.layers[1].textColor,
                }}
                className="truncate w-full text-[10px]"
              >
                {comp.layers[1].textContent}
              </span>
            )}
            <span className="text-[9px] text-muted-foreground mt-1">{comp.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

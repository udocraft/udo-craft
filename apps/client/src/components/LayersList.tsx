"use client";

import React, { useRef, useState, useEffect } from "react";
import { GripVertical, Trash2, Type, Copy } from "lucide-react";
import { PRINT_TYPES, type PrintLayer, type PrintTypeId } from "@udo-craft/shared";

export interface PrintTypePricingRow {
  id: string; print_type: string; size_label: string;
  size_min_cm: number; size_max_cm: number;
  qty_tiers: { min_qty: number; price_cents: number }[];
}

export type TextLayerPatch = Partial<Pick<PrintLayer,
  | "textContent" | "textFont" | "textColor" | "textFontSize" | "textAlign" | "textCurve"
  | "textTransform" | "textLetterSpacing" | "textLineHeight"
  | "textBold" | "textItalic" | "textOverflow"
  | "textBackgroundColor" | "textStrokeColor" | "textStrokeWidth"
  | "textBoxWidth" | "textBoxHeight" | "opacity" | "svgFillColor" | "svgStrokeColor"
>>;

function calcPrice(tiers: { min_qty: number; price_cents: number }[], qty: number): number | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => b.min_qty - a.min_qty);
  return (sorted.find((t) => qty >= t.min_qty) ?? sorted[sorted.length - 1]).price_cents;
}

function PrintTypeBadge({ typeId, small }: { typeId: string; small?: boolean }) {
  const t = PRINT_TYPES.find((x) => x.id === typeId) ?? PRINT_TYPES[0];
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"}`}
      style={{ color: t.color, backgroundColor: t.bg }}>{t.label}</span>
  );
}

export interface LayersListProps {
  layers: PrintLayer[];
  activeSide: string;
  activeLayerId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onTypeChange: (id: string, type: PrintTypeId) => void;
  onSizeLabelChange?: (id: string, sizeLabel: string) => void;
  onReorder: (layers: PrintLayer[]) => void;
  onTextChange?: (id: string, patch: TextLayerPatch) => void;
  pricing?: PrintTypePricingRow[];
  quantity?: number;
  layerScales?: Record<string, number>;
  pxToMmRatio?: number;
  disabled?: boolean;
}

export default function LayersList({
  layers, activeSide, activeLayerId,
  onSelect, onDelete, onDuplicate, onTypeChange, onSizeLabelChange, onReorder,
  pricing = [], quantity = 1, layerScales = {}, pxToMmRatio = 0,
}: LayersListProps) {
  const sideLayers = layers.filter((l) => l.side === activeSide);
  const dragItem = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const pricingRef = useRef(pricing);
  pricingRef.current = pricing;
  const sideLayersRef = useRef(sideLayers);
  sideLayersRef.current = sideLayers;
  const onSizeLabelChangeRef = useRef(onSizeLabelChange);
  onSizeLabelChangeRef.current = onSizeLabelChange;
  const pxToMmRatioRef = useRef(pxToMmRatio);
  pxToMmRatioRef.current = pxToMmRatio;

  useEffect(() => {
    const cb = onSizeLabelChangeRef.current;
    const ratio = pxToMmRatioRef.current;
    if (!cb || !ratio) return;
    const CANVAS_SIZE = 520;
    sideLayersRef.current.forEach((layer) => {
      const scale = layerScales[layer.id];
      if (!scale) return;
      const liveCm = Math.round((scale * CANVAS_SIZE * 0.4) / (ratio * 10) * 10) / 10;
      const sizePriceRows = pricingRef.current.filter((r) => r.print_type === layer.type);
      if (!sizePriceRows.length) return;
      const closest = sizePriceRows.reduce((prev, curr) =>
        Math.abs((curr.size_min_cm + curr.size_max_cm) / 2 - liveCm) <
        Math.abs((prev.size_min_cm + prev.size_max_cm) / 2 - liveCm) ? curr : prev
      );
      if (closest?.size_label && closest.size_label !== layer.sizeLabel) {
        cb(layer.id, closest.size_label);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerScales]);

  const handleDragStart = (e: React.DragEvent, idx: number, id: string) => {
    dragItem.current = idx; setDraggingId(id); e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropTarget(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragItem.current; const to = dropTarget;
    setDraggingId(null); setDropTarget(null); dragItem.current = null;
    if (from === null || to === null || from === to || from === to - 1) return;
    doReorder(from, to);
  };
  const handleDragEnd = () => { setDraggingId(null); setDropTarget(null); dragItem.current = null; };

  const touchDragIdx = useRef<number | null>(null);
  const touchGhost = useRef<{ x: number; y: number; text: string } | null>(null);
  const touchMoved = useRef(false);
  const [touchGhostState, setTouchGhostState] = useState<{ x: number; y: number; text: string } | null>(null);

  const onTouchStart = (e: React.TouchEvent, idx: number) => {
    touchDragIdx.current = idx; touchMoved.current = false; setDraggingId(sideLayers[idx].id);
    const l = sideLayers[idx]; 
    const ghost = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      text: l.kind === "text" ? (l.textContent ?? "Текст") : (l.file?.name ?? "Шар")
    };
    touchGhost.current = ghost;
    setTouchGhostState(ghost);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchDragIdx.current === null) return;
    touchMoved.current = true; e.preventDefault();
    const touch = e.touches[0];
    if (touchGhost.current) { 
      touchGhost.current.x = touch.clientX; 
      touchGhost.current.y = touch.clientY; 
      setTouchGhostState({ ...touchGhost.current });
    }
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const item = el?.closest("[data-layer-idx]");
    if (item) {
      const targetIdx = parseInt(item.getAttribute("data-layer-idx") ?? "0", 10);
      const rect = item.getBoundingClientRect();
      setDropTarget(touch.clientY < rect.top + rect.height / 2 ? targetIdx : targetIdx + 1);
    }
  };
  const onTouchEnd = () => {
    touchGhost.current = null;
    setTouchGhostState(null);
    const from = touchDragIdx.current; const to = dropTarget;
    touchDragIdx.current = null; setDraggingId(null); setDropTarget(null);
    if (touchMoved.current && from !== null && to !== null && from !== to && from !== to - 1) doReorder(from, to);
  };

  const doReorder = (from: number, to: number) => {
    const ids = sideLayers.map((l) => l.id);
    const reordered = [...ids];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to > from ? to - 1 : to, 0, moved);
    onReorder([...layers.filter((l) => l.side !== activeSide), ...reordered.map((id) => layers.find((l) => l.id === id)!)]);
  };

  if (sideLayers.length === 0) return null;

  return (
    <>
      {touchGhostState && (
        <div 
          className="fixed z-[9999] pointer-events-none opacity-90 bg-white border-2 border-primary rounded-xl px-3 py-2 text-xs font-semibold shadow-lg"
          style={{
            transform: 'translate(-50%, -50%)',
            left: `${touchGhostState.x}px`,
            top: `${touchGhostState.y}px`,
          }}
        >
          {touchGhostState.text}
        </div>
      )}
      <div onDrop={handleDrop} className="space-y-1">
      {dropTarget === 0 && <div className="h-0.5 bg-primary rounded-full mx-1" />}
      {sideLayers.map((layer, idx) => {
        const isActive = activeLayerId === layer.id;
        const sizeLabel = layer.sizeLabel;
        const sizePriceRows = pricing
          .filter((r) => r.print_type === layer.type)
          .sort((a, b) => (a.size_min_cm + a.size_max_cm) / 2 - (b.size_min_cm + b.size_max_cm) / 2)
          .slice(0, 5);
        const isText = layer.kind === "text";
        const currentType = PRINT_TYPES.find(t => t.id === layer.type) ?? PRINT_TYPES[0];

        return (
          <div key={layer.id} data-layer-idx={idx}>
            <div
              draggable onDragStart={(e) => handleDragStart(e, idx, layer.id)}
              onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
              onClick={() => onSelect(isActive ? null : layer.id)}
              role="button" aria-pressed={isActive}
              className={[
                "relative rounded-xl border cursor-pointer select-none transition-all",
                draggingId === layer.id ? "opacity-30 scale-95" : "",
                isActive
                  ? isText ? "border-violet-400 shadow-sm shadow-violet-100 bg-violet-50/50" : "border-primary shadow-sm bg-primary/5"
                  : "border-border bg-card hover:border-border/60 hover:shadow-sm",
              ].join(" ")}
            >
              <div className="flex items-center gap-0 p-2">
                <div className="flex items-center justify-center w-7 shrink-0 self-stretch text-muted-foreground/25 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing transition-colors touch-none"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => onTouchStart(e, idx)} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                  <GripVertical className="size-3.5" />
                </div>
                <div className="size-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-border/40"
                  style={{ background: "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0 / 8px 8px" }}>
                  {isText ? (
                    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
                        fontFamily={`'${layer.textFont ?? "Montserrat"}', sans-serif`}
                        fontSize="16" fill={layer.textColor ?? "#000000"}>
                        {(layer.textContent ?? "T").replace(/\n/g, " ").slice(0, 3)}
                      </text>
                    </svg>
                  ) : (
                    <img src={layer.url} alt="" className="size-full object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0 px-2">
                  <p className="text-xs font-medium truncate leading-tight text-foreground">
                    {isText ? (layer.textContent?.replace(/\n/g, " ").slice(0, 24) || "Текст") : layer.file?.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isText ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-violet-100 text-violet-700">
                        <Type className="size-2.5" /> Текст
                      </span>
                    ) : (
                      <PrintTypeBadge typeId={layer.type} small />
                    )}
                  </div>
                </div>
                <div className="flex items-center shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                  {onDuplicate && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id); }} title="Дублювати"
                      className="size-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all">
                      <Copy className="size-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(layer.id); }} aria-label="Видалити шар"
                    className="size-8 flex items-center justify-center rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {isActive && <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${isText ? "bg-violet-500" : "bg-primary"}`} />}
            </div>

            {isActive && (
              <div className="mt-1 rounded-xl border border-border bg-card overflow-visible">
                <div className="p-3 space-y-3">
                  <div className="flex gap-3 rounded-xl bg-muted/30 p-2">
                    <div className="size-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-border/40 bg-background"
                      style={{ background: "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%) 0 0 / 8px 8px" }}>
                      {isText ? (
                        <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
                            fontFamily={`'${layer.textFont ?? "Montserrat"}', sans-serif`}
                            fontSize="20" fill={layer.textColor ?? "#000000"}>
                            {(layer.textContent ?? "T").replace(/\n/g, " ").slice(0, 3)}
                          </text>
                        </svg>
                      ) : (
                        <img src={layer.url} alt="" className="size-full object-contain" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-foreground">Налаштуйте шар</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Оберіть тип нанесення та розмір. Вартість оновиться автоматично.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Тип нанесення</label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRINT_TYPES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onTypeChange(layer.id, t.id as PrintTypeId)}
                          className={`rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                            layer.type === t.id
                              ? "border-transparent text-white shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                          }`}
                          style={layer.type === t.id ? { backgroundColor: currentType.color } : undefined}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sizePriceRows.length > 0 && onSizeLabelChange && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Розмір нанесення</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {sizePriceRows.map((r) => {
                          const p = calcPrice(r.qty_tiers, quantity);
                          const selected = sizeLabel === r.size_label;
                          return (
                            <button
                              key={r.size_label}
                              type="button"
                              onClick={() => onSizeLabelChange(layer.id, r.size_label ?? "")}
                              className={`min-w-0 rounded-xl border px-1.5 py-2 text-center transition-all ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                              }`}
                            >
                              <span className="block truncate text-xs font-black uppercase">{r.size_label}</span>
                              {p ? <span className="block truncate text-[10px] opacity-75">{(p / 100).toFixed(0)} ₴</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {dropTarget === idx + 1 && <div className="h-0.5 bg-primary rounded-full mx-1 mt-1" />}
          </div>
        );
      })}
      <div className="h-3" onDragOver={(e) => { e.preventDefault(); setDropTarget(sideLayers.length); }} />
    </div>
    </>
  );
}

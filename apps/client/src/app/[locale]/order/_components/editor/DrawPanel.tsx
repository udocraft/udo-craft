"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Layers3, Palette, Pencil } from "lucide-react";
import type { PrintLayer } from "@udo-craft/shared";
import { cn } from "@/lib/utils";
import DrawingModal from "./DrawingModal";

export interface DrawPanelProps {
  fabricCanvasRef: React.RefObject<import("fabric").fabric.Canvas | null>;
  layers: PrintLayer[];
  activeSide: string;
  activeLayerId: string | null;
  onAddLayer: (file: File) => void;
  onReplaceDrawLayer: (id: string, file: File) => void;
  setLayersWithRef: (updater: PrintLayer[] | ((prev: PrintLayer[]) => PrintLayer[])) => void;
  printZoneBounds: { left: number; top: number; width: number; height: number };
  editRequestLayerId?: string | null;
  onEditRequestHandled?: () => void;
}

export default function DrawPanel({
  layers,
  activeLayerId,
  onAddLayer,
  onReplaceDrawLayer,
  editRequestLayerId,
  onEditRequestHandled,
}: DrawPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  const drawingLayers = useMemo(
    () => layers.filter((layer) => layer.kind === "drawing"),
    [layers]
  );

  const selectedDrawingLayer = useMemo(() => {
    if (!activeLayerId) return null;
    return drawingLayers.find((layer) => layer.id === activeLayerId) ?? null;
  }, [activeLayerId, drawingLayers]);

  const editableLayer = useMemo(() => {
    if (!editingLayerId) return null;
    return layers.find((layer) => layer.id === editingLayerId && layer.kind === "drawing") ?? null;
  }, [editingLayerId, layers]);

  const handlePaste = useCallback((file: File) => {
    if (editableLayer) {
      onReplaceDrawLayer(editableLayer.id, file);
    } else {
      onAddLayer(file);
    }
    setEditingLayerId(null);
  }, [editableLayer, onAddLayer, onReplaceDrawLayer]);

  useEffect(() => {
    if (!editRequestLayerId) return;
    setEditingLayerId(editRequestLayerId);
    setModalOpen(true);
    onEditRequestHandled?.();
  }, [editRequestLayerId, onEditRequestHandled]);

  const openNewDrawing = () => {
    setEditingLayerId(null);
    setModalOpen(true);
  };

  const openSelectedDrawing = () => {
    if (!selectedDrawingLayer) return;
    setEditingLayerId(selectedDrawingLayer.id);
    setModalOpen(true);
  };

  return (
    <>
      <div className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-[28px] border border-border/80 bg-gradient-to-b from-card to-muted/30 shadow-sm">
          <div className="border-b border-border/70 bg-[radial-gradient(circle_at_top,rgba(var(--primary),0.12),transparent_45%)] px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Palette className="size-3.5" />
                  Draw Studio
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  Малюйте як у справжньому графічному редакторі
                </h3>
                <p className="mt-2 max-w-[42ch] text-sm leading-6 text-muted-foreground">
                  Повноекранний адаптивний студійний режим із пером, маркером, неоном, лінією та коректним стиранням для прозорого PNG.
                </p>
              </div>
              <div className="hidden rounded-2xl border border-border bg-background/80 p-3 text-primary sm:flex">
                <Pencil className="size-5" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers3 className="size-4 text-primary" />
                Малюнкові шари
              </div>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {drawingLayers.length}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Створюйте нові ілюстрації або редагуйте вже додані на макет.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Pencil className="size-4 text-primary" />
                Поточний вибір
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {selectedDrawingLayer ? "Вибрано шар для редагування" : "Шар не вибрано"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {selectedDrawingLayer
                  ? "Відкрийте студію, щоб продовжити редагування саме цього малюнка."
                  : "Щоб відредагувати існуючий малюнок, спочатку виберіть drawing-шар на полотні або у списку шарів."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/70 px-5 py-5 sm:flex-row">
            <button
              type="button"
              onClick={openNewDrawing}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Створити новий малюнок
            </button>
            <button
              type="button"
              onClick={openSelectedDrawing}
              disabled={!selectedDrawingLayer}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedDrawingLayer
                  ? "border-border bg-background text-foreground hover:bg-muted"
                  : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
              )}
            >
              Редагувати вибраний шар
            </button>
          </div>
        </div>
      </div>

      <DrawingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLayerId(null);
        }}
        onPaste={handlePaste}
        initialImageUrl={editableLayer?.uploadedUrl || editableLayer?.url || null}
      />
    </>
  );
}

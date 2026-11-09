"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PrintLayer } from "@udo-craft/shared";
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
  garmentImageUrl?: string | null;
}

export default function DrawPanel({
  layers,
  activeLayerId,
  onAddLayer,
  onReplaceDrawLayer,
  editRequestLayerId,
  onEditRequestHandled,
  garmentImageUrl,
}: DrawPanelProps) {
  const t = useTranslations("drawing");
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
      <div className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <Button className="w-full" onClick={openNewDrawing}>
          <Pencil className="size-4" aria-hidden="true" /> {t("new")}
        </Button>
        {drawingLayers.length > 0 && (
          <Button variant="outline" className="w-full" onClick={openSelectedDrawing} disabled={!selectedDrawingLayer}>
            {t("editSelected")}
          </Button>
        )}
      </div>

      <DrawingModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingLayerId(null);
        }}
        onPaste={handlePaste}
        initialImageUrl={editableLayer?.uploadedUrl || editableLayer?.url || null}
        garmentImageUrl={garmentImageUrl}
      />
    </>
  );
}

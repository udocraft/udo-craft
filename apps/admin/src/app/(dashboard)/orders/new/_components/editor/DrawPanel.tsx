"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Palette } from "lucide-react";
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
}

export default function DrawPanel({
  layers,
  onAddLayer,
  onReplaceDrawLayer,
  editRequestLayerId,
  onEditRequestHandled,
}: DrawPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

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

  return (
    <>
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <Palette className="size-8 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">Студія малювання</p>
          <p className="text-xs text-muted-foreground">Намалюйте ілюстрацію у повноекранному редакторі та вставте як шар на полотно.</p>
        </div>
        <button
          type="button"
          onClick={openNewDrawing}
          className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        >
          Відкрити студію
        </button>
      </div>

      <DrawingModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingLayerId(null); }}
        onPaste={handlePaste}
        initialImageUrl={editableLayer?.uploadedUrl || editableLayer?.url || null}
      />
    </>
  );
}

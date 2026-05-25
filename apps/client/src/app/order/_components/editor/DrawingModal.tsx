"use client";

/**
 * DrawingModal — full-screen drawing studio.
 *
 * Opens over everything. Has its own Fabric.js canvas (transparent background).
 * When done the user can:
 *   • "Вставити" — paste the drawing as a new image layer
 *
 * Each paste creates a NEW layer (no 1-per-side limit).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check, Eraser, Minus, Pencil, RefreshCw,
  RotateCcw, RotateCw, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────

export interface DrawingModalProps {
  open: boolean;
  onClose: () => void;
  onPaste: (file: File) => void;
  initialImageUrl?: string | null;
}

type Tool = "pen" | "eraser" | "line";

const PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: "#000000", label: "Чорний" },
  { hex: "#ffffff", label: "Білий" },
  { hex: "#ef4444", label: "Червоний" },
  { hex: "#f97316", label: "Помаранчевий" },
  { hex: "#eab308", label: "Жовтий" },
  { hex: "#22c55e", label: "Зелений" },
  { hex: "#3b82f6", label: "Синій" },
  { hex: "#8b5cf6", label: "Фіолетовий" },
  { hex: "#ec4899", label: "Рожевий" },
  { hex: "#6b7280", label: "Сірий" },
  { hex: "#1e293b", label: "Темно-синій" },
  { hex: "#f8fafc", label: "Майже білий" },
];

const CANVAS_W = 1200;
const CANVAS_H = 900;

// ── Helpers ───────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl: string, name = `drawing-${Date.now()}.png`): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], name, { type: mime });
}

async function isCanvasBlank(canvas: import("fabric").fabric.Canvas): Promise<boolean> {
  const dataUrl = canvas.toDataURL({ format: "png" });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) { resolve(false); return; }
      }
      resolve(true);
    };
    img.src = dataUrl;
  });
}

function getContentBounds(canvas: import("fabric").fabric.Canvas) {
  const objects = canvas.getObjects().filter((obj) => obj.visible !== false);
  if (objects.length === 0) return null;

  const bounds = objects.map((obj) => obj.getBoundingRect(true, true));
  const left = Math.min(...bounds.map((b) => b.left));
  const top = Math.min(...bounds.map((b) => b.top));
  const right = Math.max(...bounds.map((b) => b.left + b.width));
  const bottom = Math.max(...bounds.map((b) => b.top + b.height));
  const padding = 24;

  const cropLeft = Math.max(0, Math.floor(left - padding));
  const cropTop = Math.max(0, Math.floor(top - padding));
  const cropRight = Math.min(CANVAS_W, Math.ceil(right + padding));
  const cropBottom = Math.min(CANVAS_H, Math.ceil(bottom + padding));

  return {
    left: cropLeft,
    top: cropTop,
    width: Math.max(1, cropRight - cropLeft),
    height: Math.max(1, cropBottom - cropTop),
  };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function DrawingModal({ open, onClose, onPaste, initialImageUrl }: DrawingModalProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [opacity, setOpacity] = useState(100);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [pasting, setPasting] = useState(false);

  // Line drawing state
  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewLineRef = useRef<import("fabric").fabric.Line | null>(null);

  // ── Init Fabric.js ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || !canvasElRef.current) return;
    let disposed = false;
    let canvas: import("fabric").fabric.Canvas | null = null;
    let onPathAdded: (() => void) | null = null;

    // Dynamically import fabric to avoid SSR issues
    import("fabric").then(({ fabric }) => {
      if (!canvasElRef.current || disposed) return;

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "rgba(0,0,0,0)",
        isDrawingMode: true,
        selection: false,
      });

      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = "#000000";
      canvas.freeDrawingBrush.width = 8;

      fabricRef.current = canvas;

      // Snapshot after each path added
      onPathAdded = () => {
        if (!canvas) return;
        const json = JSON.stringify(canvas.toJSON());
        setUndoStack((prev) => [...prev, json]);
        setRedoStack([]);
      };
      canvas.on("path:created", onPathAdded);

      const saveInitialState = () => {
        if (!canvas || disposed) return;
        const json = JSON.stringify(canvas.toJSON());
        setUndoStack([json]);
        setRedoStack([]);
        canvas.renderAll();
      };

      if (initialImageUrl) {
        fabric.Image.fromURL(
          initialImageUrl,
          (img) => {
            if (!canvas || disposed) return;
            const maxW = CANVAS_W * 0.8;
            const maxH = CANVAS_H * 0.8;
            const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH), 1);
            img.set({
              left: (CANVAS_W - (img.width || 0) * scale) / 2,
              top: (CANVAS_H - (img.height || 0) * scale) / 2,
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
            });
            canvas.add(img);
            canvas.sendToBack(img);
            saveInitialState();
          },
          { crossOrigin: "anonymous" }
        );
      } else {
        saveInitialState();
      }
    });

    return () => {
      disposed = true;
      if (canvas && onPathAdded) canvas.off("path:created", onPathAdded);
      canvas?.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialImageUrl]);

  // ── Apply tool settings ───────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    import("fabric").then(({ fabric }) => {
      if (tool === "pen") {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
        (canvas.freeDrawingBrush as any).opacity = opacity / 100;
      } else if (tool === "eraser") {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = "rgba(255,255,255,1)";
        canvas.freeDrawingBrush.width = brushSize * 2;
      } else if (tool === "line") {
        canvas.isDrawingMode = false;
      }
    });
  }, [tool, color, brushSize, opacity]);

  // ── Line tool mouse handlers ──────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || tool !== "line") return;

    import("fabric").then(({ fabric }) => {
      const onDown = (e: { pointer?: { x: number; y: number } }) => {
        if (!e.pointer) return;
        lineStartRef.current = { x: e.pointer.x, y: e.pointer.y };
        const line = new fabric.Line(
          [e.pointer.x, e.pointer.y, e.pointer.x, e.pointer.y],
          { stroke: color, strokeWidth: brushSize, selectable: false, evented: false, opacity: opacity / 100 }
        );
        previewLineRef.current = line;
        canvas.add(line);
      };
      const onMove = (e: { pointer?: { x: number; y: number } }) => {
        if (!lineStartRef.current || !previewLineRef.current || !e.pointer) return;
        previewLineRef.current.set({ x2: e.pointer.x, y2: e.pointer.y });
        canvas.renderAll();
      };
      const onUp = () => {
        if (!previewLineRef.current) return;
        // Snapshot
        const json = JSON.stringify(canvas.toJSON());
        setUndoStack((prev) => [...prev, json]);
        setRedoStack([]);
        lineStartRef.current = null;
        previewLineRef.current = null;
      };

      canvas.on("mouse:down", onDown);
      canvas.on("mouse:move", onMove);
      canvas.on("mouse:up", onUp);
      return () => {
        canvas.off("mouse:down", onDown);
        canvas.off("mouse:move", onMove);
        canvas.off("mouse:up", onUp);
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, color, brushSize, opacity]);

  // ── Undo / Redo ───────────────────────────────────────────────────────

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || undoStack.length <= 1) return;
    const newUndo = [...undoStack];
    const current = newUndo.pop()!;
    setRedoStack((prev) => [...prev, current]);
    setUndoStack(newUndo);
    canvas.loadFromJSON(JSON.parse(newUndo[newUndo.length - 1]), () => canvas.renderAll());
  }, [undoStack]);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;
    const newRedo = [...redoStack];
    const next = newRedo.pop()!;
    setUndoStack((prev) => [...prev, next]);
    setRedoStack(newRedo);
    canvas.loadFromJSON(JSON.parse(next), () => canvas.renderAll());
  }, [redoStack]);

  const clear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "rgba(0,0,0,0)";
    canvas.renderAll();
    const json = JSON.stringify(canvas.toJSON());
    setUndoStack([json]);
    setRedoStack([]);
  }, []);

  // ── Export ────────────────────────────────────────────────────────────

  const exportPng = useCallback((): string | null => {
    const canvas = fabricRef.current;
    if (!canvas) return null;
    const bounds = getContentBounds(canvas);
    if (!bounds) return null;
    return canvas.toDataURL({ format: "png", multiplier: 2, ...bounds });
  }, []);

  const handlePaste = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (await isCanvasBlank(canvas)) {
      toast.warning("Полотно порожнє — намалюйте щось спочатку.");
      return;
    }
    setPasting(true);
    try {
      const dataUrl = exportPng();
      if (!dataUrl) return;
      onPaste(dataUrlToFile(dataUrl));
      onClose();
    } finally {
      setPasting(false);
    }
  }, [exportPng, onPaste, onClose]);

  if (!open) return null;

  const TOOLS: { id: Tool; label: string; Icon: React.ElementType }[] = [
    { id: "pen",    label: "Олівець", Icon: Pencil  },
    { id: "eraser", label: "Гумка",   Icon: Eraser  },
    { id: "line",   label: "Лінія",   Icon: Minus   },
  ];

  return (
    <div className="fixed inset-0 z-[10002] bg-background flex flex-col" role="dialog" aria-modal="true" aria-label="Студія малювання">

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-border bg-card">
        <span className="text-sm font-semibold">Студія малювання</span>
        <button type="button" onClick={onClose} aria-label="Закрити"
          className="size-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <X className="size-4" />
        </button>
      </div>

      {/* ── Canvas area (toolbar floats inside) ── */}
      <div ref={containerRef} className="relative flex-1 min-h-0 overflow-auto bg-[repeating-conic-gradient(var(--border)_0%_25%,transparent_0%_50%)_0_0_/_20px_20px] flex items-center justify-center p-4">

        {/* Floating toolbar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-2 bg-card border border-border rounded-2xl shadow-sm overflow-x-auto max-w-[calc(100vw-24px)]">
          {/* Undo / Redo / Clear */}
          <button type="button" onClick={undo} disabled={undoStack.length <= 1} aria-label="Скасувати"
            className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <RotateCcw className="size-3.5" />
          </button>
          <button type="button" onClick={redo} disabled={redoStack.length === 0} aria-label="Повторити"
            className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <RotateCw className="size-3.5" />
          </button>
          <button type="button" onClick={clear} aria-label="Очистити"
            className="size-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Trash2 className="size-3.5" />
          </button>

          <div className="w-px h-6 bg-border shrink-0" />

          {/* Tools */}
          {TOOLS.map(({ id, label, Icon }) => (
            <button key={id} type="button" aria-label={label} aria-pressed={tool === id}
              onClick={() => setTool(id)}
              className={["size-8 flex items-center justify-center rounded-lg border transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                tool === id ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"].join(" ")}>
              <Icon className="size-3.5" />
            </button>
          ))}

          <div className="w-px h-6 bg-border shrink-0" />

          {/* Color picker */}
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            aria-label="Колір"
            className="size-8 rounded-lg cursor-pointer border-2 border-border p-0.5 bg-background shrink-0" />

          {/* Color swatches */}
          {PRESET_COLORS.map(({ hex, label }) => (
            <button key={hex} type="button" aria-label={label} onClick={() => setColor(hex)}
              style={{ backgroundColor: hex }}
              className={["size-6 rounded-md border transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                color === hex ? "border-primary ring-1 ring-primary scale-110" : "border-border hover:scale-105",
                hex === "#ffffff" ? "border-border" : ""].join(" ")} />
          ))}

          <div className="w-px h-6 bg-border shrink-0" />

          {/* Brush size */}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">Розмір</span>
          <input type="range" min={1} max={80} value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 h-1.5 accent-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{brushSize}px</span>

          {tool !== "eraser" && (
            <>
              <div className="w-px h-6 bg-border shrink-0" />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">Прозорість</span>
              <input type="range" min={10} max={100} value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-20 h-1.5 accent-primary shrink-0" />
              <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{opacity}%</span>
            </>
          )}
        </div>

        <div className="shadow-xl rounded-lg overflow-hidden border border-border mt-14">
          <canvas ref={canvasElRef} />
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 flex flex-col gap-1.5 px-4 py-3 border-t border-border bg-card">
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={handlePaste}
            disabled={pasting}
            className="rounded-full gap-2">
            {pasting
              ? <RefreshCw className="size-4 animate-spin" />
              : <Check className="size-4" />}
            Вставити
          </Button>
        </div>
      </div>
    </div>
  );
}

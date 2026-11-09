"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCw, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DRAWING_DEFAULT_COLOR, DRAWING_PRESET_COLORS, INK_BLACK } from "@/lib/canvas-colors";
import { Button } from "@/components/ui/button";
import { ToolArt, type DrawingTool } from "./DrawingTools";

export interface DrawingModalProps {
  open: boolean;
  onClose: () => void;
  onPaste: (file: File) => void;
  initialImageUrl?: string | null;
  /** Product photo shown behind the canvas for context. Never part of the exported drawing. */
  garmentImageUrl?: string | null;
}

type Tool = DrawingTool;

// Tray order: everyday tools first, eraser last (as in a pencil case).
const TOOLS: Tool[] = ["pen", "marker", "neon", "blur", "arrow", "eraser"];

const CANVAS_W = 1200;
const CANVAS_H = 900;

function dataUrlToFile(dataUrl: string, name = `drawing-${Date.now()}.png`): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/png";
  const bstr = atob(arr[1] ?? "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], name, { type: mime });
}

function createSnapshot(canvas: import("fabric").fabric.Canvas): string {
  return JSON.stringify(canvas.toJSON(["globalCompositeOperation"]));
}

async function isCanvasBlank(canvas: import("fabric").fabric.Canvas): Promise<boolean> {
  const dataUrl = canvas.toDataURL({ format: "png" });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
          resolve(false);
          return;
        }
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
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

/** Vertical slider at the canvas edge (Procreate-style), with a 44px-wide hit area. */
function EdgeSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="flex flex-col items-center gap-1.5">
      <span className="text-xs font-medium tabular-nums text-muted-foreground">{value}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-28 w-11 cursor-pointer accent-primary [direction:rtl] [writing-mode:vertical-lr] sm:h-36"
      />
      <span className="text-xs text-muted-foreground">{label}</span>
    </label>
  );
}

export default function DrawingModal({ open, onClose, onPaste, initialImageUrl, garmentImageUrl }: DrawingModalProps) {
  const t = useTranslations("drawing");
  const [ready, setReady] = useState(false);
  const [sizing, setSizing] = useState(false);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").fabric.Canvas | null>(null);
  const fabricModuleRef = useRef<(typeof import("fabric"))["fabric"] | null>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(DRAWING_DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(7);
  const [opacity, setOpacity] = useState(100);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [pasting, setPasting] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const toolRef = useRef<Tool>(tool);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const opacityRef = useRef(opacity);
  const arrowStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewArrowRef = useRef<import("fabric").fabric.Group | null>(null);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { opacityRef.current = opacity; }, [opacity]);

  const buildArrow = useCallback((
    fabric: (typeof import("fabric"))["fabric"],
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const headSize = Math.max(12, brushSizeRef.current * 2.2);

    const shaft = new fabric.Line([start.x, start.y, end.x, end.y], {
      stroke: colorRef.current,
      strokeWidth: Math.max(2, brushSizeRef.current),
      opacity: opacityRef.current / 100,
      selectable: false,
      evented: false,
      strokeLineCap: "round",
    });

    const head = new fabric.Triangle({
      left: end.x,
      top: end.y,
      originX: "center",
      originY: "center",
      width: headSize,
      height: headSize,
      fill: colorRef.current,
      opacity: opacityRef.current / 100,
      angle: angle + 90,
      selectable: false,
      evented: false,
    });

    return new fabric.Group([shaft, head], {
      selectable: false,
      evented: false,
      objectCaching: false,
    });
  }, []);

  const pushSnapshot = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = createSnapshot(canvas);
    setUndoStack((prev) => (prev[prev.length - 1] === json ? prev : [...prev, json]));
    setRedoStack([]);
  }, []);

  const restoreSnapshot = useCallback((snapshot: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.loadFromJSON(JSON.parse(snapshot), () => {
      canvas.renderAll();
    });
  }, []);

  const applyBrushSettings = useCallback(() => {
    const canvas = fabricRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;

    if (toolRef.current === "arrow") {
      canvas.isDrawingMode = false;
      canvas.defaultCursor = "crosshair";
      return;
    }

    const brush = new fabric.PencilBrush(canvas);
    const baseWidth = brushSizeRef.current;
    const baseOpacity = opacityRef.current / 100;

    brush.color = colorRef.current;
    brush.width = baseWidth;
    (brush as unknown as { opacity?: number }).opacity = baseOpacity;

    if (toolRef.current === "marker") {
      brush.width = Math.max(10, Math.round(baseWidth * 1.7));
      (brush as unknown as { opacity?: number }).opacity = Math.min(baseOpacity, 0.45);
    }

    if (toolRef.current === "neon") {
      brush.width = Math.max(6, Math.round(baseWidth * 1.15));
      (brush as unknown as { opacity?: number }).opacity = Math.max(0.72, baseOpacity);
      brush.shadow = new fabric.Shadow({
        color: colorRef.current,
        blur: Math.max(16, Math.round(brush.width * 1.8)),
        offsetX: 0,
        offsetY: 0,
      });
    }

    if (toolRef.current === "blur") {
      brush.width = Math.max(12, Math.round(baseWidth * 1.9));
      (brush as unknown as { opacity?: number }).opacity = Math.min(baseOpacity, 0.18);
      brush.shadow = new fabric.Shadow({
        color: colorRef.current,
        blur: Math.max(18, Math.round(brush.width * 1.6)),
        offsetX: 0,
        offsetY: 0,
      });
    }

    if (toolRef.current === "eraser") {
      brush.width = Math.max(10, Math.round(baseWidth * 1.8));
      brush.color = INK_BLACK;
      (brush as unknown as { opacity?: number }).opacity = 1;
    }

    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
    canvas.defaultCursor = toolRef.current === "eraser" ? "cell" : "crosshair";
  }, []);

  useEffect(() => {
    if (!open || !stageViewportRef.current) return;

    const element = stageViewportRef.current;
    const updateSize = () => {
      setStageSize({
        width: Math.max(0, element.clientWidth - 24),
        height: Math.max(0, element.clientHeight - 24),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open || !canvasElRef.current) return;

    let disposed = false;
    let detachPathListener: (() => void) | null = null;

    import("fabric").then(({ fabric }) => {
      if (!canvasElRef.current || disposed) return;

      fabricModuleRef.current = fabric;

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: "rgba(0,0,0,0)",
        isDrawingMode: true,
        selection: false,
        preserveObjectStacking: true,
        allowTouchScrolling: false,
      });

      const upperCanvasEl = (canvas as import("fabric").fabric.Canvas & { upperCanvasEl?: HTMLCanvasElement }).upperCanvasEl;
      if (upperCanvasEl) upperCanvasEl.style.touchAction = "none";
      canvas.defaultCursor = "crosshair";
      fabricRef.current = canvas;
      setReady(true);
      applyBrushSettings();

      const onPathCreated = (event: import("fabric").fabric.IEvent) => {
        const path = (event as unknown as { path?: import("fabric").fabric.Object }).path;
        if (!path || !fabricRef.current) return;

        path.set({ selectable: false, evented: false });

        if (toolRef.current === "eraser") {
          (path as import("fabric").fabric.Object & { globalCompositeOperation?: string }).globalCompositeOperation = "destination-out";
        }

        fabricRef.current.requestRenderAll();
        pushSnapshot();
      };

      canvas.on("path:created", onPathCreated);
      detachPathListener = () => canvas.off("path:created", onPathCreated);

      const finalizeInitialState = () => {
        if (disposed || !fabricRef.current) return;
        const json = createSnapshot(fabricRef.current);
        setUndoStack([json]);
        setRedoStack([]);
        fabricRef.current.renderAll();
      };

      if (initialImageUrl) {
        fabric.Image.fromURL(
          initialImageUrl,
          (img) => {
            if (!fabricRef.current || disposed) return;
            const maxW = CANVAS_W * 0.82;
            const maxH = CANVAS_H * 0.82;
            const scale = Math.min(maxW / (img.width || maxW), maxH / (img.height || maxH), 1);
            img.set({
              left: (CANVAS_W - (img.width || 0) * scale) / 2,
              top: (CANVAS_H - (img.height || 0) * scale) / 2,
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false,
            });
            fabricRef.current.add(img);
            fabricRef.current.sendToBack(img);
            finalizeInitialState();
          },
          { crossOrigin: "anonymous" }
        );
      } else {
        finalizeInitialState();
      }
    });

    return () => {
      disposed = true;
      setReady(false);
      detachPathListener?.();
      fabricRef.current?.dispose();
      fabricRef.current = null;
      fabricModuleRef.current = null;
      arrowStartRef.current = null;
      previewArrowRef.current = null;
      setUndoStack([]);
      setRedoStack([]);
    };
  }, [applyBrushSettings, initialImageUrl, open, pushSnapshot]);

  useEffect(() => {
    if (!open) return;
    applyBrushSettings();
  }, [applyBrushSettings, brushSize, color, open, opacity, tool]);

  useEffect(() => {
    if (!open) return;
    const canvas = fabricRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;

    const handleMouseDown = (event: { pointer?: { x: number; y: number } }) => {
      if (toolRef.current !== "arrow" || !event.pointer) return;
      arrowStartRef.current = { x: event.pointer.x, y: event.pointer.y };
      const arrow = buildArrow(fabric, arrowStartRef.current, event.pointer);
      previewArrowRef.current = arrow;
      canvas.add(arrow);
      canvas.renderAll();
    };

    const handleMouseMove = (event: { pointer?: { x: number; y: number } }) => {
      if (!arrowStartRef.current || !previewArrowRef.current || toolRef.current !== "arrow" || !event.pointer) return;
      canvas.remove(previewArrowRef.current);
      const arrow = buildArrow(fabric, arrowStartRef.current, event.pointer);
      previewArrowRef.current = arrow;
      canvas.add(arrow);
      canvas.renderAll();
    };

    const handleMouseUp = () => {
      if (toolRef.current !== "arrow" || !previewArrowRef.current) return;
      pushSnapshot();
      arrowStartRef.current = null;
      previewArrowRef.current = null;
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [buildArrow, open, pushSnapshot]);

  const canvasDisplay = useMemo(() => {
    if (!stageSize.width || !stageSize.height) return { width: 0, height: 0 };
    const scale = Math.min(stageSize.width / CANVAS_W, stageSize.height / CANVAS_H, 1);
    return { width: Math.round(CANVAS_W * scale), height: Math.round(CANVAS_H * scale) };
  }, [stageSize.height, stageSize.width]);

  // Fit the 1200x900 canvas to the stage with CSS only: the backstore keeps full resolution
  // and fabric maps pointer positions through the CSS scale.
  useEffect(() => {
    if (!ready || !canvasDisplay.width) return;
    fabricRef.current?.setDimensions({ width: `${canvasDisplay.width}px`, height: `${canvasDisplay.height}px` }, { cssOnly: true });
  }, [ready, canvasDisplay.width, canvasDisplay.height]);

  // Show the brush dot on the canvas while the size slider moves.
  useEffect(() => {
    if (!sizing) return;
    const timer = setTimeout(() => setSizing(false), 900);
    return () => clearTimeout(timer);
  }, [sizing, brushSize]);

  const undo = useCallback(() => {
    if (undoStack.length <= 1) return;
    const previous = undoStack[undoStack.length - 2];
    const current = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, current]);
    setUndoStack((prev) => prev.slice(0, -1));
    restoreSnapshot(previous);
  }, [restoreSnapshot, undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, next]);
    setRedoStack((prev) => prev.slice(0, -1));
    restoreSnapshot(next);
  }, [redoStack, restoreSnapshot]);

  const clear = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "rgba(0,0,0,0)";
    canvas.renderAll();
    const json = createSnapshot(canvas);
    setUndoStack([json]);
    setRedoStack([]);
    toast.success(t("cleared"));
  }, [t]);

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
      toast.warning(t("empty"));
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
  }, [exportPng, onClose, onPaste, t]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (isMeta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          const lastRedo = redoStack[redoStack.length - 1];
          if (!lastRedo) return;
          setUndoStack((prev) => [...prev, lastRedo]);
          setRedoStack((prev) => prev.slice(0, -1));
          restoreSnapshot(lastRedo);
        } else {
          if (undoStack.length <= 1) return;
          const previous = undoStack[undoStack.length - 2];
          const current = undoStack[undoStack.length - 1];
          setRedoStack((prev) => [...prev, current]);
          setUndoStack((prev) => prev.slice(0, -1));
          restoreSnapshot(previous);
        }
        return;
      }
      if (isMeta && event.key === "Enter") {
        event.preventDefault();
        void handlePaste();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePaste, onClose, open, redoStack, restoreSnapshot, undoStack]);

  if (!open) return null;

  const displayScale = canvasDisplay.width / CANVAS_W;
  const iconBtn = "flex size-11 items-center justify-center rounded-full text-foreground transition-colors duration-fast hover:bg-muted disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  // Portal to <body>: the customizer sheet is transformed, which traps position:fixed inside it.
  return createPortal(
    <div className="fixed inset-0 z-[10002] flex h-dvh flex-col overflow-hidden bg-muted text-foreground" role="dialog" aria-modal="true" aria-label={t("title")}>
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-border bg-background/90 px-2 backdrop-blur-xl sm:px-4">
        <button type="button" onClick={onClose} aria-label={t("close")} className={iconBtn}>
          <X className="size-5" aria-hidden="true" />
        </button>
        <h2 className="ml-1 truncate text-sm font-semibold max-sm:sr-only">{t("title")}</h2>
        <div className="flex-1" />
        <button type="button" onClick={undo} disabled={undoStack.length <= 1} aria-label={t("undo")} className={iconBtn}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={redo} disabled={redoStack.length === 0} aria-label={t("redo")} className={iconBtn}>
          <RotateCw className="size-5" aria-hidden="true" />
        </button>
        <button type="button" onClick={clear} aria-label={t("clear")} className={iconBtn}>
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
        <Button className="ml-1" onClick={() => void handlePaste()} disabled={pasting}>
          {pasting ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
          {t("done")}
        </Button>
      </header>

      <div className="relative min-h-0 flex-1">
        {/* pl leaves room for the edge sliders so they never sit on the artwork. */}
        <div ref={stageViewportRef} className="absolute inset-0 flex items-center justify-center py-3 pl-24 pr-3 sm:pl-28 sm:pr-28">
          <div
            className="relative overflow-hidden rounded-card bg-background shadow-xl ring-1 ring-border"
            style={{ width: canvasDisplay.width || undefined, height: canvasDisplay.height || undefined }}
          >
            {garmentImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- decorative backdrop, any host, no layout shift (absolute)
              <img src={garmentImageUrl} alt="" className="pointer-events-none absolute inset-0 size-full object-contain opacity-70" />
            )}
            <canvas ref={canvasElRef} />
            {sizing && tool !== "arrow" && (
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-foreground/30"
                style={{ width: Math.max(2, brushSize * displayScale), height: Math.max(2, brushSize * displayScale), backgroundColor: tool === "eraser" ? "transparent" : color, opacity: opacity / 100 }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="absolute left-1.5 top-1/2 flex -translate-y-1/2 flex-col gap-4 rounded-[2rem] border border-border bg-background/90 px-2 py-4 shadow-lg backdrop-blur-xl sm:left-4">
          <EdgeSlider label={t("size")} value={brushSize} min={1} max={80} onChange={(v) => { setBrushSize(v); setSizing(true); }} />
          {tool !== "eraser" && <EdgeSlider label={t("opacity")} value={opacity} min={10} max={100} onChange={setOpacity} />}
        </div>
      </div>

      <footer className="shrink-0 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-5xl flex-col lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-6">
          <div role="group" aria-label={t("color")} className="flex items-center gap-1 overflow-x-auto px-3 py-2 lg:order-2 lg:px-0 lg:py-4">
            {DRAWING_PRESET_COLORS.map(({ hex }, i) => (
              <button
                key={hex}
                type="button"
                aria-label={`${t("color")} ${i + 1}`}
                aria-pressed={color === hex}
                onClick={() => setColor(hex)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn("size-7 rounded-full ring-1 ring-foreground/15 transition-transform duration-fast", color === hex && "scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                  style={{ backgroundColor: hex }}
                />
              </button>
            ))}
            <label className="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full focus-within:ring-2 focus-within:ring-ring">
              <span className="size-7 rounded-full ring-1 ring-foreground/15 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" aria-hidden="true" />
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t("customColor")} />
            </label>
          </div>

          {/* Tools stand in the tray with their lower half hidden; the selected one rises. */}
          <div role="group" aria-label={t("title")} className="flex h-24 items-start justify-center gap-1 overflow-hidden px-3 lg:order-1 lg:h-28 lg:justify-start lg:px-0">
            {TOOLS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTool(id)}
                aria-pressed={tool === id}
                aria-label={t(id)}
                title={t(id)}
                className={cn(
                  "shrink-0 rounded-t-xl px-1 pt-1 transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  tool === id ? "translate-y-1" : "translate-y-9 hover:translate-y-7",
                )}
              >
                <ToolArt tool={id} color={color} />
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>,
    document.body,
  );
}

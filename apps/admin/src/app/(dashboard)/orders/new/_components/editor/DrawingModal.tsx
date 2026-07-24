"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Eraser,
  Highlighter,
  Minus,
  Pencil,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DrawingModalProps {
  open: boolean;
  onClose: () => void;
  onPaste: (file: File) => void;
  initialImageUrl?: string | null;
}

type Tool = "pen" | "arrow" | "marker" | "neon" | "blur" | "eraser";

type ToolMeta = {
  id: Tool;
  label: string;
  hint: string;
  Icon: React.ElementType;
  sample: "pen" | "arrow" | "marker" | "neon" | "blur" | "eraser";
};

const PRESET_COLORS: { hex: string; label: string }[] = [
  { hex: "#ffffff", label: "Білий" },
  { hex: "#ff453a", label: "Червоний" },
  { hex: "#ff9f0a", label: "Помаранчевий" },
  { hex: "#ffd60a", label: "Жовтий" },
  { hex: "#30d158", label: "Зелений" },
  { hex: "#64d2ff", label: "Блакитний" },
  { hex: "#0a84ff", label: "Синій" },
  { hex: "#bf5af2", label: "Фіолетовий" },
  { hex: "#ff2d55", label: "Рожевий" },
  { hex: "#000000", label: "Чорний" },
];

const TOOLS: ToolMeta[] = [
  { id: "pen", label: "Pen", hint: "Чіткі контури та ескізи", Icon: Pencil, sample: "pen" },
  { id: "arrow", label: "Arrow", hint: "Швидкі напрямні стрілки", Icon: ArrowRight, sample: "arrow" },
  { id: "marker", label: "Marker", hint: "М’які широкі штрихи", Icon: Highlighter, sample: "marker" },
  { id: "neon", label: "Neon", hint: "Яскраве світіння для акцентів", Icon: Sparkles, sample: "neon" },
  { id: "blur", label: "Blur", hint: "М’який розмитий слід", Icon: Minus, sample: "blur" },
  { id: "eraser", label: "Eraser", hint: "Прозоре стирання", Icon: Eraser, sample: "eraser" },
];

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

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-white/72">{label}</span>
        <span className="text-3xl font-light tracking-tight text-white/70">
          {value}
          <span className="ml-0.5 text-lg">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#ffd60a]"
        aria-label={label}
      />
    </div>
  );
}

function ToolSample({ sample, color }: { sample: ToolMeta["sample"]; color: string }) {
  if (sample === "arrow") {
    return (
      <div className="relative h-8 w-24">
        <div className="absolute left-0 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
        <div className="absolute left-0 right-4 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ backgroundColor: color }} />
        <div
          className="absolute right-1 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-l-[13px] border-y-transparent"
          style={{ borderLeftColor: color }}
        />
      </div>
    );
  }

  if (sample === "marker") {
    return (
      <div className="relative h-8 w-24">
        <div className="absolute left-0 right-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-white/8" />
        <div className="absolute left-2 right-7 top-1/2 h-3 -translate-y-1/2 rounded-full opacity-60" style={{ backgroundColor: color }} />
      </div>
    );
  }

  if (sample === "neon") {
    return (
      <div className="relative h-8 w-24">
        <div className="absolute left-0 right-8 top-1/2 h-2.5 -translate-y-1/2 rounded-full opacity-90" style={{ backgroundColor: color, boxShadow: `0 0 14px ${color}, 0 0 28px ${color}` }} />
      </div>
    );
  }

  if (sample === "blur") {
    return (
      <div className="relative h-8 w-24">
        <div className="absolute left-0 right-10 top-1/2 h-4 -translate-y-1/2 rounded-full opacity-35 blur-sm" style={{ backgroundColor: color, boxShadow: `0 0 18px ${color}` }} />
      </div>
    );
  }

  if (sample === "eraser") {
    return (
      <div className="relative h-8 w-24">
        <div className="absolute left-0 right-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-white/8" />
        <div className="absolute left-1 right-8 top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-white/12" />
        <div className="absolute right-1 top-1/2 h-5 w-8 -translate-y-1/2 rounded-lg bg-[#f1a1ad]" />
      </div>
    );
  }

  return (
    <div className="relative h-8 w-24">
      <div className="absolute left-0 right-8 top-1/2 h-1.5 -translate-y-1/2 rounded-full" style={{ backgroundColor: color }} />
    </div>
  );
}

function ToolCard({
  tool,
  active,
  color,
  onClick,
}: {
  tool: ToolMeta;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-4 rounded-3xl border px-4 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
        active
          ? "border-white/14 bg-white/8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          : "border-transparent bg-white/[0.04] hover:border-white/10 hover:bg-white/[0.06]"
      )}
    >
      <ToolSample sample={tool.sample} color={color} />
      <div className="min-w-0 flex-1">
        <div className="text-lg font-medium text-white">{tool.label}</div>
        <div className="mt-0.5 text-xs text-white/45">{tool.hint}</div>
      </div>
    </button>
  );
}

export default function DrawingModal({ open, onClose, onPaste, initialImageUrl }: DrawingModalProps) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<import("fabric").fabric.Canvas | null>(null);
  const fabricModuleRef = useRef<(typeof import("fabric"))["fabric"] | null>(null);
  const stageViewportRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffd60a");
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
      brush.color = "#000000";
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
    if (!stageSize.width || !stageSize.height) {
      return { width: CANVAS_W, height: CANVAS_H };
    }
    const scale = Math.min(stageSize.width / CANVAS_W, stageSize.height / CANVAS_H, 1);
    return {
      width: Math.max(280, Math.round(CANVAS_W * scale)),
      height: Math.max(210, Math.round(CANVAS_H * scale)),
    };
  }, [stageSize.height, stageSize.width]);

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
    toast.success("Полотно очищено.");
  }, []);

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
  }, [exportPng, onClose, onPaste]);

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

  const quickTools = TOOLS.slice(0, 5);

  const inspector = (
    <div className="space-y-5">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-white/72">Color</span>
          <label className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/75 transition-all hover:border-white/20 hover:bg-white/10">
            Custom
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="sr-only" aria-label="Власний колір" />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          {PRESET_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              aria-label={label}
              onClick={() => setColor(hex)}
              className={cn(
                "relative size-11 rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                color === hex ? "scale-110 border-white shadow-[0_0_0_16px_rgba(255,214,10,0.08)]" : "border-white/10 hover:scale-105"
              )}
              style={{ backgroundColor: hex }}
            >
              {color === hex && <span className="absolute inset-0 rounded-full ring-2 ring-white/70 ring-offset-2 ring-offset-transparent" />}
            </button>
          ))}
        </div>
      </div>

      <SliderField label="Size" value={brushSize} min={1} max={80} onChange={setBrushSize} suffix="" />

      {tool !== "eraser" && (
        <SliderField label="Opacity" value={opacity} min={10} max={100} onChange={setOpacity} suffix="%" />
      )}

      <div>
        <div className="mb-3 text-sm font-medium text-white/72">Tool</div>
        <div className="space-y-3">
          {TOOLS.map((item) => (
            <ToolCard key={item.id} tool={item} active={tool === item.id} color={color} onClick={() => setTool(item.id)} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10002] flex flex-col overflow-hidden bg-[#1f1f1f] text-white" role="dialog" aria-modal="true" aria-label="Студія малювання">
      <div className="shrink-0 border-b border-white/8 bg-[#202020] px-4 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Студія малювання</p>
            <p className="mt-0.5 text-xs text-white/45">
              {initialImageUrl ? "Редагування існуючого drawing-шару" : "Нове полотно з прозорим фоном"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={undoStack.length <= 1}
              aria-label="Скасувати"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={redoStack.length === 0}
              aria-label="Повторити"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              <RotateCw className="size-4" />
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="Очистити"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              <Trash2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-b border-white/8 bg-[#202020] px-3 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 overflow-x-auto">
          {quickTools.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              className={cn(
                "flex min-w-[72px] flex-col items-center gap-1 rounded-3xl px-3 py-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]",
                tool === id ? "bg-[#2e2e2e] text-[#0a84ff] shadow-[inset_0_-3px_0_0_#0a84ff]" : "text-white/68 hover:bg-white/6"
              )}
            >
              <span className={cn("flex size-11 items-center justify-center rounded-full border", tool === id ? "border-[#0a84ff]/30 bg-[#3a3a3a]" : "border-white/10 bg-white/5") }>
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div ref={stageViewportRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#242424] px-3 pb-[24rem] pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.03),transparent_30%)]" />
          <div className="relative rounded-[26px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:24px_24px]">
              <div style={{ width: `${canvasDisplay.width}px`, height: `${canvasDisplay.height}px` }}>
                <canvas ref={canvasElRef} style={{ width: "100%", height: "100%", display: "block" }} />
              </div>
            </div>
          </div>
        </div>

        <aside className="hidden h-full w-[420px] shrink-0 overflow-y-auto border-l border-white/8 bg-[#202020] px-5 py-5 lg:block">
          {inspector}
        </aside>
      </div>

      <div className="lg:hidden shrink-0 border-t border-white/8 bg-[#202020] px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-h-[48svh] max-w-[960px] overflow-y-auto pr-1">
          {inspector}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/8 bg-[#202020] px-4 py-3 sm:px-5">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/45">
            PNG автоматично обрізається по контуру малюнка. Гарячі клавіші: Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z, Cmd/Ctrl+Enter.
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white/82 transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              Закрити
            </button>
            <button
              type="button"
              onClick={() => void handlePaste()}
              disabled={pasting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#1f1f1f] transition-all hover:bg-white/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a84ff]"
            >
              {pasting ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
              Вставити на полотно
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

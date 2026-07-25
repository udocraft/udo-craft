"use client";

import { useCallback, useRef, useState } from "react";
import { ELEMENT_PRESETS } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PenConfig {
  color: string;
  size: number;    // 1–100
  opacity: number; // 0–100
}

export interface EraserConfig {
  size: number; // 10–200
}

export interface LineConfig {
  color: string;
  strokeWidth: number; // 1–50
  opacity: number;     // 0–100
}

export interface ShapeStampConfig {
  shapeId: string | null;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number; // 0–20
}

export type DrawingTool = "pen" | "eraser" | "line" | "shape-stamp";

export interface DrawingSessionState {
  activeTool: DrawingTool;
  penConfig: PenConfig;
  eraserConfig: EraserConfig;
  lineConfig: LineConfig;
  shapeStampConfig: ShapeStampConfig;
  isDrawingMode: boolean;
  sessionObjectCount: number;
  undoStackDepth: number;
  redoStackDepth: number;
}

export interface UseDrawingSessionReturn {
  session: DrawingSessionState;
  setActiveTool: (tool: DrawingTool) => void;
  setPenConfig: (patch: Partial<PenConfig>) => void;
  setEraserConfig: (patch: Partial<EraserConfig>) => void;
  setLineConfig: (patch: Partial<LineConfig>) => void;
  setShapeStampConfig: (patch: Partial<ShapeStampConfig>) => void;
  startSession: (existingDrawLayerUrl?: string) => Promise<void>;
  saveSession: () => Promise<File | null>;
  clearSession: () => void;
  undo: () => void;
  redo: () => void;
  handleCanvasClick: (e: { pointer: { x: number; y: number } }) => void;
  handleMouseDown: (e: { pointer: { x: number; y: number } }) => void;
  handleMouseMove: (e: { pointer: { x: number; y: number } }) => void;
  handleMouseUp: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, data] = dataUrl.split(",");
  const mime = header.replace("data:", "").replace(";base64", "");
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

async function isDataUrlBlank(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(false); return; }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) { resolve(false); return; }
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useDrawingSession(
  fabricCanvasRef: React.RefObject<import("fabric").fabric.Canvas | null>,
  printZoneBounds: { left: number; top: number; width: number; height: number }
): UseDrawingSessionReturn {
  const sessionObjectsRef = useRef<import("fabric").fabric.Object[]>([]);
  const undoStackRef = useRef<import("fabric").fabric.Object[][]>([]);
  const redoStackRef = useRef<import("fabric").fabric.Object[][]>([]);
  const backgroundRefObj = useRef<import("fabric").fabric.Image | null>(null);

  const lineStartRef = useRef<{ x: number; y: number } | null>(null);
  const previewLineRef = useRef<import("fabric").fabric.Line | null>(null);
  const eraserDragSnapshotTaken = useRef(false);

  const [session, setSession] = useState<DrawingSessionState>({
    activeTool: "pen",
    penConfig: { color: "#000000", size: 8, opacity: 100 },
    eraserConfig: { size: 30 },
    lineConfig: { color: "#000000", strokeWidth: 3, opacity: 100 },
    shapeStampConfig: { shapeId: null, fillColor: "#000000", strokeColor: "transparent", strokeWidth: 0 },
    isDrawingMode: false,
    sessionObjectCount: 0,
    undoStackDepth: 0,
    redoStackDepth: 0,
  });

  const syncCounts = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      sessionObjectCount: sessionObjectsRef.current.length,
      undoStackDepth: undoStackRef.current.length,
      redoStackDepth: redoStackRef.current.length,
    }));
  }, []);

  const applyTool = useCallback((tool: DrawingTool, penCfg: PenConfig) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (tool === "pen") {
      canvas.isDrawingMode = true;
      const brush = canvas.freeDrawingBrush;
      if (brush) {
        brush.color = penCfg.color;
        brush.width = penCfg.size;
        (brush as unknown as { opacity?: number }).opacity = penCfg.opacity / 100;
      }
    } else {
      canvas.isDrawingMode = false;
    }
  }, [fabricCanvasRef]);

  const setActiveTool = useCallback((tool: DrawingTool) => {
    setSession((prev) => {
      const next = { ...prev, activeTool: tool, isDrawingMode: tool === "pen" };
      applyTool(tool, prev.penConfig);
      return next;
    });
  }, [applyTool]);

  const setPenConfig = useCallback((patch: Partial<PenConfig>) => {
    setSession((prev) => {
      const next = { ...prev, penConfig: { ...prev.penConfig, ...patch } };
      if (prev.activeTool === "pen") applyTool("pen", next.penConfig);
      return next;
    });
  }, [applyTool]);

  const setEraserConfig = useCallback((patch: Partial<EraserConfig>) => {
    setSession((prev) => ({ ...prev, eraserConfig: { ...prev.eraserConfig, ...patch } }));
  }, []);

  const setLineConfig = useCallback((patch: Partial<LineConfig>) => {
    setSession((prev) => ({ ...prev, lineConfig: { ...prev.lineConfig, ...patch } }));
  }, []);

  const setShapeStampConfig = useCallback((patch: Partial<ShapeStampConfig>) => {
    setSession((prev) => ({ ...prev, shapeStampConfig: { ...prev.shapeStampConfig, ...patch } }));
  }, []);

  const undo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    redoStackRef.current.push([...sessionObjectsRef.current]);
    const prev = undoStackRef.current.pop()!;
    sessionObjectsRef.current.forEach((obj) => {
      if (!prev.includes(obj)) canvas.remove(obj);
    });
    sessionObjectsRef.current = prev;
    canvas.renderAll();
    syncCounts();
  }, [fabricCanvasRef, syncCounts]);

  const redo = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;
    undoStackRef.current.push([...sessionObjectsRef.current]);
    const next = redoStackRef.current.pop()!;
    next.forEach((obj) => {
      if (!sessionObjectsRef.current.includes(obj)) canvas.add(obj);
    });
    sessionObjectsRef.current = next;
    canvas.renderAll();
    syncCounts();
  }, [fabricCanvasRef, syncCounts]);

  const startSession = useCallback(async (existingDrawLayerUrl?: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    sessionObjectsRef.current.forEach((obj) => canvas.remove(obj));
    sessionObjectsRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (backgroundRefObj.current) {
      canvas.remove(backgroundRefObj.current);
      backgroundRefObj.current = null;
    }

    if (existingDrawLayerUrl) {
      await new Promise<void>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).fabric?.Image?.fromURL(
          existingDrawLayerUrl,
          (img: import("fabric").fabric.Image) => {
            img.set({
              left: printZoneBounds.left,
              top: printZoneBounds.top,
              selectable: false,
              evented: false,
            });
            const scaleX = printZoneBounds.width / (img.width ?? 1);
            const scaleY = printZoneBounds.height / (img.height ?? 1);
            img.set({ scaleX, scaleY });
            canvas.add(img);
            canvas.sendToBack(img);
            backgroundRefObj.current = img;
            resolve();
          },
          { crossOrigin: "anonymous" }
        );
      });
    }

    setSession((prev) => ({
      ...prev,
      isDrawingMode: prev.activeTool === "pen",
      sessionObjectCount: 0,
      undoStackDepth: 0,
      redoStackDepth: 0,
    }));

    applyTool(session.activeTool, session.penConfig);
  }, [fabricCanvasRef, printZoneBounds, applyTool, session.activeTool, session.penConfig]);

  const clearSession = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    sessionObjectsRef.current.forEach((obj) => canvas.remove(obj));
    sessionObjectsRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    canvas.renderAll();
    syncCounts();
  }, [fabricCanvasRef, syncCounts]);

  const saveSession = useCallback(async (): Promise<File | null> => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    if (sessionObjectsRef.current.length === 0 && !backgroundRefObj.current) return null;

    const dataUrl = canvas.toDataURL({
      format: "png",
      left: printZoneBounds.left,
      top: printZoneBounds.top,
      width: printZoneBounds.width,
      height: printZoneBounds.height,
      multiplier: 2,
    });

    const blank = await isDataUrlBlank(dataUrl);
    if (blank) return null;

    return dataUrlToFile(dataUrl, `drawing-${Date.now()}.png`);
  }, [fabricCanvasRef, printZoneBounds]);

  const handleMouseDown = useCallback((e: { pointer: { x: number; y: number } }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (session.activeTool === "line") {
      lineStartRef.current = { x: e.pointer.x, y: e.pointer.y };
    } else if (session.activeTool === "eraser") {
      eraserDragSnapshotTaken.current = false;
    }
  }, [fabricCanvasRef, session.activeTool]);

  const handleMouseMove = useCallback((e: { pointer: { x: number; y: number } }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (session.activeTool === "line" && lineStartRef.current) {
      if (previewLineRef.current) canvas.remove(previewLineRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fabric = (window as any).fabric;
      if (!fabric) return;
      const line = new fabric.Line(
        [lineStartRef.current.x, lineStartRef.current.y, e.pointer.x, e.pointer.y],
        {
          stroke: session.lineConfig.color,
          strokeWidth: session.lineConfig.strokeWidth,
          opacity: session.lineConfig.opacity / 100,
          selectable: false,
          evented: false,
        }
      );
      canvas.add(line);
      previewLineRef.current = line;
      canvas.renderAll();
    } else if (session.activeTool === "eraser") {
      const eraserR = session.eraserConfig.size / 2;
      const ex = e.pointer.x;
      const ey = e.pointer.y;
      const toRemove = sessionObjectsRef.current.filter((obj) => {
        const b = obj.getBoundingRect();
        return (
          ex + eraserR > b.left &&
          ex - eraserR < b.left + b.width &&
          ey + eraserR > b.top &&
          ey - eraserR < b.top + b.height
        );
      });
      if (toRemove.length > 0) {
        if (!eraserDragSnapshotTaken.current) {
          undoStackRef.current.push([...sessionObjectsRef.current]);
          redoStackRef.current = [];
          eraserDragSnapshotTaken.current = true;
        }
        toRemove.forEach((obj) => canvas.remove(obj));
        sessionObjectsRef.current = sessionObjectsRef.current.filter((o) => !toRemove.includes(o));
        canvas.renderAll();
        syncCounts();
      }
    }
  }, [fabricCanvasRef, session.activeTool, session.lineConfig, session.eraserConfig, syncCounts]);

  const handleMouseUp = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (session.activeTool === "line" && lineStartRef.current && previewLineRef.current) {
      const finalLine = previewLineRef.current;
      finalLine.set({ selectable: false, evented: false });
      undoStackRef.current.push([...sessionObjectsRef.current]);
      redoStackRef.current = [];
      sessionObjectsRef.current.push(finalLine);
      previewLineRef.current = null;
      lineStartRef.current = null;
      canvas.renderAll();
      syncCounts();
    }
  }, [fabricCanvasRef, session.activeTool, syncCounts]);

  const handleCanvasClick = useCallback((e: { pointer: { x: number; y: number } }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || session.activeTool !== "shape-stamp") return;
    const { shapeId, fillColor, strokeColor, strokeWidth } = session.shapeStampConfig;
    if (!shapeId) return;

    const shape = ELEMENT_PRESETS.find((s) => s.id === shapeId);
    if (!shape) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabric = (window as any).fabric;
    if (!fabric) return;

    fabric.loadSVGFromURL(
      shape.svgPath,
      (objects: import("fabric").fabric.Object[], options: object) => {
        const group = fabric.util.groupSVGElements(objects, options);
        group.set({
          left: e.pointer.x - (group.width ?? 50) / 2,
          top: e.pointer.y - (group.height ?? 50) / 2,
          fill: fillColor,
          stroke: strokeColor === "transparent" ? "" : strokeColor,
          strokeWidth,
          selectable: false,
          evented: false,
        });
        undoStackRef.current.push([...sessionObjectsRef.current]);
        redoStackRef.current = [];
        sessionObjectsRef.current.push(group);
        canvas.add(group);
        canvas.renderAll();
        syncCounts();
      }
    );
  }, [fabricCanvasRef, session.activeTool, session.shapeStampConfig, syncCounts]);

  const registerPenListener = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const onPathAdded = (e: import("fabric").fabric.IEvent) => {
      const path = (e as unknown as { path?: import("fabric").fabric.Object }).path;
      if (!path) return;
      undoStackRef.current.push([...sessionObjectsRef.current]);
      redoStackRef.current = [];
      sessionObjectsRef.current.push(path);
      syncCounts();
    };
    canvas.on("path:created", onPathAdded);
    return () => { canvas.off("path:created", onPathAdded); };
  }, [fabricCanvasRef, syncCounts]);

  return {
    session,
    setActiveTool,
    setPenConfig,
    setEraserConfig,
    setLineConfig,
    setShapeStampConfig,
    startSession,
    saveSession,
    clearSession,
    undo,
    redo,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    // @ts-expect-error — extra field for internal use
    registerPenListener,
  };
}

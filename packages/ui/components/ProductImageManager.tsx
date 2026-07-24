"use client";

import React, { useRef, useState, useCallback } from "react";
import type { ProductImage } from "@udo-craft/shared";

// ── Icons (inline SVG — lucide not available in packages/ui) ─────────────────

const GripIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="5" cy="4" r="1" fill="currentColor" />
    <circle cx="9" cy="4" r="1" fill="currentColor" />
    <circle cx="5" cy="7" r="1" fill="currentColor" />
    <circle cx="9" cy="7" r="1" fill="currentColor" />
    <circle cx="5" cy="10" r="1" fill="currentColor" />
    <circle cx="9" cy="10" r="1" fill="currentColor" />
  </svg>
);

const CanvasIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const PhotoIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductImageManagerProps {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  uploadUrl: string;
  uploadTagPrefix?: string;
  disabled?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 32) || `img_${Date.now()}`
  );
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((x, i) => ({ ...(x as object), sort_order: i } as T));
}

// ── Image Preview Overlay ─────────────────────────────────────────────────────

interface PreviewOverlayProps {
  url: string;
  label?: string;
  onClose: () => void;
}

function PreviewOverlay({ url, label, onClose }: PreviewOverlayProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label || "Перегляд зображення"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "32rem",
          width: "100%",
          backgroundColor: "#fff",
          borderRadius: "0.75rem",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            zIndex: 1,
            width: "1.75rem",
            height: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            backgroundColor: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <XIcon />
        </button>
        <img
          src={url}
          alt={label || "preview"}
          style={{ width: "100%", height: "auto", display: "block", maxHeight: "80vh", objectFit: "contain" }}
        />
        {label && (
          <div
            style={{
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              color: "#374151",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductImageManager({
  images,
  onChange,
  uploadUrl,
  uploadTagPrefix = "product",
  disabled = false,
}: ProductImageManagerProps) {
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  // dragOver tracks the row index being dragged over (for reorder highlight)
  const [dragOver, setDragOver] = useState<number | null>(null);
  // fileDragOver tracks which thumbnail is receiving a file drop
  const [fileDragOver, setFileDragOver] = useState<number | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);
  // HTML5 drag-reorder ref — stores the source row index
  const dragFrom = useRef<number | null>(null);
  // Flag to distinguish file-drop drag events from row-reorder drag events
  const isDraggingFile = useRef(false);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const update = useCallback(
    (index: number, patch: Partial<ProductImage>) => {
      onChange(images.map((img, i) => (i === index ? { ...img, ...patch } : img)));
    },
    [images, onChange]
  );

  const add = () => {
    const next: ProductImage = {
      key: `img_${Date.now()}`,
      url: "",
      label: "",
      is_customizable: false,
      sort_order: images.length,
    };
    onChange([...images, next]);
  };

  const remove = (index: number) => {
    onChange(
      images
        .filter((_, i) => i !== index)
        .map((img, i) => ({ ...img, sort_order: i }))
    );
  };

  // ── Upload (file object) ───────────────────────────────────────────────────

  const handleUpload = async (index: number, file: File) => {
    setUploading((p) => ({ ...p, [index]: true }));
    try {
      const fd = new FormData();
      fd.append("files", file);
      fd.append("tags", `${uploadTagPrefix},${images[index]?.key || "image"}`);
      const res = await fetch(uploadUrl, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const url = data.results?.[0]?.url ?? data.urls?.[0];
      if (!url) throw new Error("No URL returned");
      update(index, { url });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading((p) => ({ ...p, [index]: false }));
    }
  };

  // ── (a) HTML5 drag — row reorder ───────────────────────────────────────────

  const onRowDragStart = (e: React.DragEvent, i: number) => {
    isDraggingFile.current = false;
    dragFrom.current = i;
    e.dataTransfer.effectAllowed = "move";
  };

  const onRowDragOver = (e: React.DragEvent, i: number) => {
    // Only handle row reorder if we're not hovering a file drop
    if (isDraggingFile.current) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(i);
  };

  const onRowDrop = (e: React.DragEvent, toIndex: number) => {
    if (isDraggingFile.current) return;
    e.preventDefault();
    if (dragFrom.current !== null && dragFrom.current !== toIndex) {
      onChange(reorder(images, dragFrom.current, toIndex));
    }
    dragFrom.current = null;
    setDragOver(null);
  };

  const onRowDragEnd = () => {
    dragFrom.current = null;
    setDragOver(null);
    isDraggingFile.current = false;
  };

  // ── (b) File drop — on thumbnail area ─────────────────────────────────────

  const onThumbDragEnter = (e: React.DragEvent, i: number) => {
    // Check if the dragged item contains files (not a row reorder)
    if (e.dataTransfer.types.includes("Files")) {
      isDraggingFile.current = true;
      e.preventDefault();
      e.stopPropagation();
      setFileDragOver(i);
      setDragOver(i); // also highlight the row
    }
  };

  const onThumbDragOver = (e: React.DragEvent, i: number) => {
    if (e.dataTransfer.types.includes("Files")) {
      isDraggingFile.current = true;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setFileDragOver(i);
      setDragOver(i);
    }
  };

  const onThumbDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragOver(null);
    setDragOver(null);
    isDraggingFile.current = false;
  };

  const onThumbDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    setFileDragOver(null);
    setDragOver(null);
    isDraggingFile.current = false;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(i, file);
    }
  };

  // ── URL input paste ────────────────────────────────────────────────────────

  const onUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted) {
      e.preventDefault();
      update(index, { url: pasted });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const previewImg = previewIndex !== null ? images[previewIndex] : null;

  return (
    <>
      <div className="space-y-2">
        {images.length === 0 && (
          <p className="text-xs text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
            Немає фотографій. Натисніть «Додати фото».
          </p>
        )}

        {images.map((img, index) => (
          <div
            key={index}
            draggable={!disabled}
            onDragStart={(e) => onRowDragStart(e, index)}
            onDragOver={(e) => onRowDragOver(e, index)}
            onDrop={(e) => onRowDrop(e, index)}
            onDragEnd={onRowDragEnd}
            className={`flex items-start gap-2 p-2 rounded-lg border bg-background transition-colors ${
              dragOver === index
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                : "border-border"
            }`}
          >
            {/* Drag handle */}
            <span className="text-muted-foreground cursor-grab shrink-0 touch-none mt-2">
              <GripIcon />
            </span>

            {/* Thumbnail column */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              {/* Thumbnail drop zone */}
              <div
                className={`relative w-12 h-12 rounded-md border bg-muted overflow-hidden cursor-pointer transition-colors ${
                  fileDragOver === index
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                    : "border-border hover:border-primary"
                }`}
                onClick={() => {
                  if (!disabled) {
                    if (img.url) {
                      // Click on existing image → open preview
                      setPreviewIndex(index);
                    } else {
                      fileRefs.current[index]?.click();
                    }
                  }
                }}
                title={img.url ? "Клікніть для перегляду / перетягніть файл" : "Клікніть або перетягніть файл для завантаження"}
                onDragEnter={(e) => !disabled && onThumbDragEnter(e, index)}
                onDragOver={(e) => !disabled && onThumbDragOver(e, index)}
                onDragLeave={onThumbDragLeave}
                onDrop={(e) => !disabled && onThumbDrop(e, index)}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.label || img.key}
                    className="w-full h-full object-contain p-0.5"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <UploadIcon />
                  </div>
                )}

                {/* File-drop overlay */}
                {fileDragOver === index && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(59,130,246,0.6)",
                      color: "#fff",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      textAlign: "center",
                      pointerEvents: "none",
                      lineHeight: 1.2,
                    }}
                  >
                    Сюди
                  </div>
                )}

                {/* Upload spinner */}
                {uploading[index] && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <svg className="w-4 h-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* URL snippet below thumbnail */}
              {img.url && (
                <span
                  title={img.url}
                  style={{
                    display: "block",
                    width: "3rem",
                    fontSize: "0.5rem",
                    lineHeight: 1.2,
                    color: "#9ca3af",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                  }}
                >
                  {img.url}
                </span>
              )}

              {/* Upload file input */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => fileRefs.current[index]?.click()}
                title="Завантажити файл"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "3rem",
                  height: "1.25rem",
                  fontSize: "0.55rem",
                  borderRadius: "0.25rem",
                  border: "1px solid #e5e7eb",
                  backgroundColor: "transparent",
                  color: "#9ca3af",
                  cursor: "pointer",
                  gap: "0.2rem",
                }}
              >
                <UploadIcon />
                <span>Файл</span>
              </button>
            </div>

            <input
              ref={(el) => { fileRefs.current[index] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(index, f);
                e.target.value = "";
              }}
            />

            {/* Middle column: label + url input */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Label */}
              <input
                type="text"
                value={img.label}
                placeholder="Назва (напр. «На моделі»)"
                disabled={disabled}
                onChange={(e) => {
                  const label = e.target.value;
                  const autoKey =
                    img.key.startsWith("img_") || img.key === slugKey(img.label);
                  update(index, {
                    label,
                    ...(autoKey ? { key: slugKey(label) } : {}),
                  });
                }}
                className="w-full h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              />

              {/* URL paste input */}
              <input
                type="url"
                value={img.url}
                placeholder="Або вставте URL..."
                disabled={disabled}
                onChange={(e) => update(index, { url: e.target.value })}
                onPaste={(e) => onUrlPaste(e, index)}
                className="w-full h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 text-muted-foreground"
              />
            </div>

            {/* is_customizable toggle */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => update(index, { is_customizable: !img.is_customizable })}
              title={
                img.is_customizable
                  ? "Сторона для кастомізації (натисніть щоб змінити)"
                  : "Тільки галерея (натисніть щоб змінити)"
              }
              className={`shrink-0 flex items-center gap-1 px-2 h-8 rounded-md text-[10px] font-semibold border transition-colors ${
                img.is_customizable
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {img.is_customizable ? <CanvasIcon /> : <PhotoIcon />}
              <span className="hidden sm:inline">
                {img.is_customizable ? "Канвас" : "Галерея"}
              </span>
            </button>

            {/* Delete */}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(index)}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              title="Видалити"
            >
              <XIcon />
            </button>
          </div>
        ))}

        {/* Add photo */}
        <button
          type="button"
          disabled={disabled}
          onClick={add}
          className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          <PlusIcon />
          Додати фото
        </button>
      </div>

      {/* Full-size image preview overlay */}
      {previewImg && previewImg.url && (
        <PreviewOverlay
          url={previewImg.url}
          label={previewImg.label || previewImg.key}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </>
  );
}

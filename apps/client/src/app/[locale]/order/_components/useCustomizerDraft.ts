"use client";

/**
 * useCustomizerDraft
 *
 * Persists the in-progress customizer session to localStorage so that
 * a page reload doesn't wipe the user's work.
 *
 * What is saved:
 *   - productId (key)
 *   - selectedColor, selectedSize, quantity, itemNote, activeSide
 *   - layers — only those that can be safely reconstructed:
 *       • image/drawing layers that have an uploadedUrl (already on server)
 *       • text layers (reconstructed from their data, no File needed)
 *
 * Layers with only a local blob URL (not yet uploaded) are skipped because
 * blob URLs are revoked after the page unloads.
 */

import { useCallback, useEffect, useRef } from "react";
import type { PrintLayer } from "@udo-craft/shared";

const STORAGE_PREFIX = "udo_customizer_draft_";
const DRAFT_VERSION = 1;

// ── Serialisable layer shape ──────────────────────────────────────────────

interface SerializedLayer {
  id: string;
  uploadedUrl: string;       // empty string for text layers
  type: PrintLayer["type"];
  side: string;
  kind?: PrintLayer["kind"];
  sizeLabel?: string;
  sizeMinCm?: number;
  sizeMaxCm?: number;
  priceCents?: number;
  transform?: PrintLayer["transform"];
  // text fields
  textContent?: string;
  textFont?: PrintLayer["textFont"];
  textColor?: string;
  textFontSize?: number;
  textAlign?: PrintLayer["textAlign"];
  textCurve?: number;
  textTransform?: PrintLayer["textTransform"];
  textLetterSpacing?: number;
  textLineHeight?: number;
  textBold?: boolean;
  textItalic?: boolean;
  textOverflow?: PrintLayer["textOverflow"];
  textBackgroundColor?: string;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textBoxWidth?: number;
  textBoxHeight?: number;
}

interface DraftData {
  version: number;
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  itemNote: string;
  activeSide: string;
  layers: SerializedLayer[];
  savedAt: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function serializeLayer(l: PrintLayer): SerializedLayer | null {
  const isText = l.kind === "text";
  const hasUploadedUrl = !!l.uploadedUrl;

  // Skip image/drawing layers that haven't been uploaded yet
  if (!isText && !hasUploadedUrl) return null;

  return {
    id: l.id,
    uploadedUrl: l.uploadedUrl ?? "",
    type: l.type,
    side: l.side,
    kind: l.kind,
    sizeLabel: l.sizeLabel,
    sizeMinCm: l.sizeMinCm,
    sizeMaxCm: l.sizeMaxCm,
    priceCents: l.priceCents,
    transform: l.transform,
    textContent: l.textContent,
    textFont: l.textFont,
    textColor: l.textColor,
    textFontSize: l.textFontSize,
    textAlign: l.textAlign,
    textCurve: l.textCurve,
    textTransform: l.textTransform,
    textLetterSpacing: l.textLetterSpacing,
    textLineHeight: l.textLineHeight,
    textBold: l.textBold,
    textItalic: l.textItalic,
    textOverflow: l.textOverflow,
    textBackgroundColor: l.textBackgroundColor,
    textStrokeColor: l.textStrokeColor,
    textStrokeWidth: l.textStrokeWidth,
    textBoxWidth: l.textBoxWidth,
    textBoxHeight: l.textBoxHeight,
  };
}

function deserializeLayer(s: SerializedLayer): PrintLayer {
  const isText = s.kind === "text";
  // Reconstruct a synthetic File placeholder
  const file = new File([], isText ? "text-layer.txt" : "restored-image.png", {
    type: isText ? "text/plain" : "image/png",
  });
  return {
    id: s.id,
    file,
    url: s.uploadedUrl,
    uploadedUrl: s.uploadedUrl || undefined,
    type: s.type,
    side: s.side,
    kind: s.kind,
    sizeLabel: s.sizeLabel,
    sizeMinCm: s.sizeMinCm,
    sizeMaxCm: s.sizeMaxCm,
    priceCents: s.priceCents,
    transform: s.transform,
    textContent: s.textContent,
    textFont: s.textFont,
    textColor: s.textColor,
    textFontSize: s.textFontSize,
    textAlign: s.textAlign,
    textCurve: s.textCurve,
    textTransform: s.textTransform,
    textLetterSpacing: s.textLetterSpacing,
    textLineHeight: s.textLineHeight,
    textBold: s.textBold,
    textItalic: s.textItalic,
    textOverflow: s.textOverflow,
    textBackgroundColor: s.textBackgroundColor,
    textStrokeColor: s.textStrokeColor,
    textStrokeWidth: s.textStrokeWidth,
    textBoxWidth: s.textBoxWidth,
    textBoxHeight: s.textBoxHeight,
  };
}

function storageKey(productId: string) {
  return `${STORAGE_PREFIX}${productId}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface CustomizerDraftState {
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  itemNote: string;
  activeSide: string;
  layers: PrintLayer[];
}

export interface UseCustomizerDraftReturn {
  /** Call once on mount to get any saved draft. Returns null if none. */
  loadDraft: () => CustomizerDraftState | null;
  /** Call whenever state changes to persist it. Debounced 800ms. */
  saveDraft: (state: CustomizerDraftState) => void;
  /** Call when the user adds to cart or closes — removes the draft. */
  clearDraft: () => void;
}

export function useCustomizerDraft(productId: string): UseCustomizerDraftReturn {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = storageKey(productId);

  const loadDraft = useCallback((): CustomizerDraftState | null => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const draft = JSON.parse(raw) as DraftData;
      if (draft.version !== DRAFT_VERSION) return null;
      if (draft.productId !== productId) return null;
      // Discard drafts older than 7 days
      if (Date.now() - draft.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      return {
        selectedColor: draft.selectedColor,
        selectedSize: draft.selectedSize,
        quantity: draft.quantity,
        itemNote: draft.itemNote,
        activeSide: draft.activeSide,
        layers: draft.layers.map(deserializeLayer),
      };
    } catch {
      return null;
    }
  }, [key, productId]);

  const saveDraft = useCallback((state: CustomizerDraftState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const serializedLayers = state.layers
          .map(serializeLayer)
          .filter((l): l is SerializedLayer => l !== null);

        const draft: DraftData = {
          version: DRAFT_VERSION,
          productId,
          selectedColor: state.selectedColor,
          selectedSize: state.selectedSize,
          quantity: state.quantity,
          itemNote: state.itemNote,
          activeSide: state.activeSide,
          layers: serializedLayers,
          savedAt: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(draft));
      } catch { /* quota exceeded — ignore */ }
    }, 800);
  }, [key, productId]);

  const clearDraft = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }, [key]);

  // Clean up pending save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { loadDraft, saveDraft, clearDraft };
}

"use client";

import { useCallback, useState } from "react";

// ── System prompts ────────────────────────────────────────────────────────

export const ILLUSTRATION_SYSTEM_PROMPT = `
You are an illustration generator for a print-on-demand platform.
Generate standalone artwork/illustrations suitable for printing on clothing and merchandise.

Rules:
- Generate ONLY flat, vector-style or artistic illustrations
- NO people, NO faces, NO merch/clothing context
- Suitable for DTF, screen printing, or embroidery
- Clean edges, high contrast, print-ready aesthetic
- Ukrainian cultural motifs, nature, geometric patterns, or abstract art are preferred
- Output should look like a professional graphic design asset
`.trim();

export const ENHANCE_DRAWING_SYSTEM_PROMPT = `
You are an illustration enhancer for a print-on-demand platform.
You receive a rough sketch or freehand drawing and transform it into polished, print-ready artwork.

Rules:
- Enhance the provided sketch into clean, professional illustration artwork
- Preserve the original composition and intent of the sketch
- Apply clean lines, solid fills, and print-ready contrast
- NO people, NO faces, NO merch/clothing context
- Output should be suitable for DTF, screen printing, or embroidery
- Style: flat vector illustration or bold graphic art
`.trim();

// 1×1 transparent PNG for routes that require an imageDataUrl
const BLANK_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// ── Types ─────────────────────────────────────────────────────────────────

export interface UseAIIllustrationReturn {
  generate: (prompt: string) => Promise<string | null>;
  enhance: (drawLayerDataUrl: string, prompt: string) => Promise<string | null>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useAIIllustration(): UseAIIllustrationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const generate = useCallback(async (prompt: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          contextDescription: "Generate a standalone illustration for print-on-demand.",
          imageDataUrl: BLANK_PNG_DATA_URL,
          mode: "illustration",
        }),
      });
      const data = await res.json() as { dataUrl?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      return data.dataUrl ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const enhance = useCallback(async (drawLayerDataUrl: string, prompt: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          contextDescription: "Enhance the provided drawing.",
          imageDataUrl: drawLayerDataUrl,
          mode: "enhance",
        }),
      });
      const data = await res.json() as { dataUrl?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Enhancement failed");
      return data.dataUrl ?? null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI enhancement failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, enhance, loading, error, clearError };
}

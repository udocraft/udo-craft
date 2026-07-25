"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  type PrintPreset,
  type PrintTypePricingRow,
} from "@udo-craft/shared";
import { createClient } from "@/lib/supabase/client";
import { useAIIllustration } from "./useAIIllustration";
import type { AiQuotaState } from "@/hooks/useAiQuota";

export interface PrintsPanelProps {
  activeSide: string;
  printPricing: PrintTypePricingRow[];
  onAddLayer: (file: File) => void;
  isAuthenticated: boolean;
  aiQuota: AiQuotaState;
  onPaywall: () => void;
}

function SkeletonCard() {
  return <div className="rounded-lg bg-muted animate-pulse aspect-square" />;
}

// ── B2B prompt placeholders ───────────────────────────────────────────────

const AI_PROMPTS = [
  "Принт до 20-річчя IT-компанії: мінімалістичний герб з кодом і зіркою, темно-синій на білому",
  "Логотип-ілюстрація для корпоративного мерчу кав'ярні: зерно кави у вигляді серця, flat design",
  "Принт для команди стартапу: ракета зі шестернями, bold graphic, чорно-жовта палітра",
  "Ілюстрація для мерчу ресторану: шеф-кухар з тарілкою, лінійний стиль, монохром",
  "Принт для корпоративного івенту: абстрактні хвилі з написом «Team 2025», градієнт синій-фіолетовий",
  "Мерч для IT-конференції: піксельний дракон з ноутбуком, ретро-гейм стиль",
  "Принт для HoReCa: виноградна лоза з бокалом, елегантний лінійний арт",
  "Ілюстрація для університетського мерчу: сова з книгою та шестернею, flat vector",
];

function useRotatingIndex(active: boolean, interval = 7000) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * AI_PROMPTS.length));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % AI_PROMPTS.length), interval);
    return () => clearInterval(id);
  }, [active, interval]);
  return idx;
}

// ── AI Illustration section ───────────────────────────────────────────────

interface AIIllustrationSectionProps {
  onAddLayer: (file: File) => void;
  isAuthenticated: boolean;
  aiQuota: AiQuotaState;
  onPaywall: () => void;
}

function AIIllustrationSection({ onAddLayer, isAuthenticated, aiQuota, onPaywall }: AIIllustrationSectionProps) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const ai = useAIIllustration();
  const idx = useRotatingIndex(!aiPrompt && !focused);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!isAuthenticated) {
      onPaywall();
      return;
    }
    if (aiQuota.isExhausted) return;
    if (!aiPrompt.trim()) return;
    const dataUrl = await ai.generate(aiPrompt.trim());
    if (!dataUrl) return;
    await aiQuota.increment();
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    onAddLayer(new File([blob], `ai-illustration-${Date.now()}.png`, { type: "image/png" }));
  }, [ai, aiPrompt, onAddLayer, isAuthenticated, aiQuota, onPaywall]);

  const showPlaceholder = !aiPrompt && !focused;

  return (
    <section className="px-3 pt-3 pb-4 border-b border-border">
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        AI Ілюстрація
      </h3>
      <p className="text-[10px] text-muted-foreground mb-2">
        Генеруйте ілюстрації для друку за текстовим описом.
      </p>

      {/* Textarea with animated placeholder overlay */}
      <div className="relative mb-2">
        <textarea
          ref={textareaRef}
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={4}
          placeholder=""
          className="w-full px-3 py-2.5 text-xs font-sans rounded-xl border border-input bg-background resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed"
          aria-label="Запит для AI ілюстрації"
        />

        {/* Animated placeholder — only when empty and not focused */}
        <AnimatePresence mode="wait">
          {showPlaceholder && (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              onClick={() => textareaRef.current?.focus()}
              className="absolute inset-0 px-3 py-2.5 text-xs font-sans text-muted-foreground/60 leading-relaxed pointer-events-none select-none overflow-hidden"
              aria-hidden="true"
            >
              {AI_PROMPTS[idx]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        disabled={!aiPrompt.trim() || ai.loading || aiQuota.isExhausted}
        onClick={handleGenerate}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {ai.loading && <RefreshCw className="size-3.5 animate-spin" />}
        {ai.loading ? "Генерація…" : "Згенерувати"}
      </button>

      {/* Quota-exhausted message */}
      {aiQuota.isExhausted && (
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Ви використали 3 безкоштовні генерації
        </p>
      )}

      {ai.error && (
        <div className="flex items-start gap-2 p-2 rounded-xl bg-destructive/10 text-destructive mt-2">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px]">{ai.error}</p>
            <button type="button" onClick={ai.clearError} className="text-[10px] underline mt-0.5">Закрити</button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function PrintsPanel({ onAddLayer, isAuthenticated, aiQuota, onPaywall }: PrintsPanelProps) {
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [loading, setLoading] = useState(true);
  // null = not yet tried, string = error, false = table doesn't exist (silent)
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);
  const [presetsSearch, setPresetsSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: sbError } = await supabase
        .from("print_presets")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (sbError) {
        // Table doesn't exist yet — hide section silently
        if (sbError.message.includes("schema cache") || sbError.message.includes("does not exist") || sbError.code === "42P01") {
          setTableExists(false);
        } else {
          throw new Error(sbError.message);
        }
      } else {
        setPresets((data as PrintPreset[]) ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити принти");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  const filteredPresets = presetsSearch.trim()
    ? presets.filter((p) => {
        const q = presetsSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q));
      })
    : presets;

  const handleAddPreset = useCallback(async (preset: PrintPreset) => {
    if (addingId) return;
    setAddingId(preset.id);
    try {
      const res = await fetch(preset.file_url);
      if (!res.ok) throw new Error("Failed to fetch preset file");
      const blob = await res.blob();
      const ext = preset.file_url.split(".").pop()?.split("?")[0] ?? "png";
      onAddLayer(new File([blob], `${preset.name}.${ext}`, { type: blob.type }));
    } catch { /* silently ignore */ } finally { setAddingId(null); }
  }, [addingId, onAddLayer]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* ── AI Illustration — always at top ── */}
      <AIIllustrationSection onAddLayer={onAddLayer} isAuthenticated={isAuthenticated} aiQuota={aiQuota} onPaywall={onPaywall} />

      {/* ── Print presets — only when table exists ── */}
      {tableExists && (
        <section className="px-3 pt-3 pb-4">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Готові принти
          </h3>

          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Пошук принтів…" value={presetsSearch}
              onChange={(e) => setPresetsSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            {presetsSearch && (
              <button type="button" onClick={() => setPresetsSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Скинути пошук">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <AlertCircle className="size-5 text-destructive" />
              <p className="text-xs text-muted-foreground">{error}</p>
              <button type="button" onClick={fetchPresets}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                <RefreshCw className="size-3" />
                Повторити
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {filteredPresets.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-muted-foreground">Принтів не знайдено.</p>
                  {presetsSearch && (
                    <button type="button" onClick={() => setPresetsSearch("")}
                      className="mt-1 text-xs text-primary hover:underline">
                      Скинути пошук
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredPresets.map((preset) => (
                    <button key={preset.id} type="button" disabled={addingId === preset.id}
                      onClick={() => handleAddPreset(preset)}
                      aria-label={preset.name}
                      className="group relative rounded-lg overflow-hidden border border-border bg-muted aspect-square hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all disabled:opacity-60"
                      title={preset.name}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.thumbnail_url} alt={preset.name} className="w-full h-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-foreground/60 text-primary-foreground text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {preset.name}
                      </span>
                      {addingId === preset.id && (
                        <span className="absolute inset-0 flex items-center justify-center bg-foreground/30">
                          <RefreshCw className="size-4 text-primary-foreground animate-spin" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

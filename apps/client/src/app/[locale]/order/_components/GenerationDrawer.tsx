"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, ChevronLeft, Upload,
  Shirt, Scissors, Palette, Brush, Sparkles, Star, Wand2,
  Layers, PenTool, Printer, Zap, Gem, Crown, Heart,
  Package, Tag, Ruler, Paintbrush,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAIGeneration } from "./useAIGeneration";
import { dataUrlToFile } from "../_lib/dataUrlToFile";

import type { PrintLayer } from "@udo-craft/shared";
import type { PrintTypePricingRow } from "@udo-craft/shared";
import type { AiQuotaState } from "@/hooks/useAiQuota";

const MAX_GENERATIONS = 1;

const ALL_PRESETS = [
  "команда ІТ-компанії в сучасному офісі",
  "бариста у затишній кав'ярні",
  "учасники масштабного бізнес-івенту",
  "персонал ресторану у фірмовому одязі",
  "спікер на технологічній конференції",
  "колеги на корпоративній вечірці",
  "працівники стартапу в коворкінгу",
  "студент-розробник на кампусі",
];

const PROGRESS_PHRASES = [
  "Аналізуємо запит...",
  "Підбираємо образ...",
  "Накладаємо мерч...",
  "Фінальні штрихи...",
];

const MATRIX_ICONS = [
  Shirt, Scissors, Palette, Brush, Sparkles, Star, Wand2,
  Layers, PenTool, Printer, Zap, Gem, Crown, Heart,
  Package, Tag, Ruler, Paintbrush,
];

const COLS = 4;
const ROWS = 4;
const TOTAL = COLS * ROWS;

function MatrixIconGrid() {
  const [heads, setHeads] = useState<number[]>(() =>
    Array.from({ length: COLS }, (_, i) => -1 - i * 2)
  );
  const [icons, setIcons] = useState<number[]>(() =>
    Array.from({ length: TOTAL }, () => Math.floor(Math.random() * MATRIX_ICONS.length))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setHeads((prev) =>
        prev.map((h) => {
          const next = h + 1;
          return next > ROWS + 2 ? -(1 + Math.floor(Math.random() * 4)) : next;
        })
      );
      setIcons((prev) => {
        const next = [...prev];
        heads.forEach((h, col) => {
          if (h >= 0 && h < ROWS) {
            next[h * COLS + col] = Math.floor(Math.random() * MATRIX_ICONS.length);
          }
        });
        return next;
      });
    }, 120);
    return () => clearInterval(id);
  }, [heads]);

  return (
    <div className="grid grid-cols-4 gap-2 p-2">
      {Array.from({ length: TOTAL }, (_, idx) => {
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const head = heads[col];
        const dist = row - head;
        const isHead = dist === 0;
        const isTrail = dist > 0 && dist <= 3;
        const opacity = isHead ? 1 : isTrail ? 1 - dist * 0.28 : 0.12;
        const Icon = MATRIX_ICONS[icons[idx]];
        return (
          <div
            key={idx}
            className={`flex items-center justify-center w-10 h-10 rounded-lg transition-colors duration-100 ${
              isHead ? "bg-primary/25 text-primary" : isTrail ? "bg-primary/10 text-primary/60" : "bg-muted/40 text-muted-foreground/20"
            }`}
            style={{ opacity }}
          >
            <Icon className="size-5" />
          </div>
        );
      })}
    </div>
  );
}

function RotatingPresets({ onSelect, selected }: { onSelect: (text: string) => void; selected: string }) {
  const [visible, setVisible] = useState<string[]>(() =>
    [...ALL_PRESETS].sort(() => Math.random() - 0.5).slice(0, 3)
  );
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // Stop rotating once user picks a chip
  const frozen = !!selected;

  useEffect(() => {
    if (frozen) return;
    const id = setInterval(() => {
      const current = visibleRef.current;
      const others = ALL_PRESETS.filter((p) => !current.includes(p));
      const pool = others.length >= 3 ? others : ALL_PRESETS;
      setVisible([...pool].sort(() => Math.random() - 0.5).slice(0, 3));
    }, 3000);
    return () => clearInterval(id);
  }, [frozen]);

  // When a chip is selected, ensure it's in the visible list
  useEffect(() => {
    if (selected && !visible.includes(selected)) {
      setVisible((prev) => [selected, ...prev.slice(0, 2)]);
    }
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex gap-1.5 flex-wrap">
      <AnimatePresence mode="popLayout">
        {visible.map((preset) => {
          const isActive = preset === selected;
          return (
            <motion.button
              key={preset}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25 }}
              onClick={() => onSelect(isActive ? "" : preset)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {preset}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function GeneratingThumbnail({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-left hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="shrink-0 w-10 h-10 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <Sparkles className="size-4 text-primary" />
        </motion.div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary">Генерація в процесі…</p>
        <p className="text-xs text-muted-foreground truncate">Натисніть, щоб переглянути</p>
      </div>
    </motion.button>
  );
}

function SelfieUpload({
  selfieDataUrl,
  onUpload,
  onClear,
}: {
  selfieDataUrl: string | null;
  onUpload: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") onUpload(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-[140px]">
      {selfieDataUrl ? (
        <div className="relative w-full h-full rounded-xl border border-border overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selfieDataUrl} alt="Ваше фото" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <p className="text-xs text-white/90 font-medium mb-3">Фото завантажено</p>
            <Button variant="secondary" size="sm" onClick={onClear} aria-label="Видалити фото">
              <X className="size-3.5 mr-1.5" /> Видалити
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/70 bg-muted/30 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="bg-background rounded-full p-2.5 shadow-sm border border-border">
            <Upload className="size-4 text-muted-foreground" />
          </div>
          <div className="text-center px-4">
            <p className="text-xs font-semibold text-foreground">Завантажте своє фото</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Відкриє камеру або галерею</p>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export interface GenerationDrawerProps {
  open: boolean;
  onClose: () => void;
  addLayer: (file: File, side: string, pricing: PrintTypePricingRow[]) => void;
  activeSide: string;
  printPricing: PrintTypePricingRow[];
  captureRef: React.MutableRefObject<(() => string) | null>;
  layers: PrintLayer[];
  mockups: Record<string, string>;
  selectedColor: string;
  productImages: Record<string, string>;
  productName: string;
  aiQuota: AiQuotaState;
}

export function GenerationDrawer({
  open, onClose, addLayer, activeSide, printPricing,
  captureRef, layers, mockups, selectedColor, productImages, productName,
  aiQuota,
}: GenerationDrawerProps) {
  const [prompt, setPrompt] = useState("");
  // generated + previewImage persist across open/close so user can't re-generate
  const [generated, setGenerated] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<"selfie" | "prompt">("selfie");
  const [progressIndex, setProgressIndex] = useState(0);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);

  const handleSuccess = useCallback((dataUrl: string) => {
    setPreviewImage(dataUrl);
    setGenerated(true);
    aiQuota.increment();
  }, [aiQuota]);

  const { generate, loading, error, clearError } = useAIGeneration({
    activeSide, captureRef, layers, mockups, selectedColor,
    productImages, productName, onSuccess: handleSuccess,
    selfieDataUrl: selfieDataUrl ?? undefined,
  });

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setProgressIndex((prev) => (prev + 1) % PROGRESS_PHRASES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [loading]);

  // On close: only reset UI state (step, prompt, error) — NOT generated/previewImage/loading
  // so the limit persists across open/close cycles
  useEffect(() => {
    if (!open) { clearError(); setPrompt(""); setStep(1); }
  }, [open, clearError]);

  const activeSideLayers = layers.filter((l) => l.side === activeSide);
  const otherSideWithLayers = layers.find((l) => l.side !== activeSide);
  const showHint = activeSideLayers.length === 0 && !!otherSideWithLayers && step === 1;
  const limitReached = generated || loading;
  const canGenerate = !limitReached && !loading && !aiQuota.isExhausted && (activeTab === "selfie" ? !!selfieDataUrl : !!prompt.trim());

  const handleGenerateClick = async () => {
    setStep(2);
    setProgressIndex(0);
    setPreviewImage(null);
    clearError();
    await generate(prompt);
  };

  // kept for potential future use
  const _handleAddToCanvas = () => {
    if (!previewImage) return;
    addLayer(dataUrlToFile(previewImage), activeSide, printPricing);
    onClose();
  };

  // suppress unused warning
  void MAX_GENERATIONS;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[10000] bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="drawer"
            className="fixed bottom-0 left-0 right-0 z-[10001] flex justify-center pointer-events-none"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="max-w-sm w-full mx-auto rounded-t-2xl bg-background shadow-xl pointer-events-auto overflow-hidden">
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="px-4 pb-5 min-h-[300px]">
                <AnimatePresence mode="wait">

                  {step === 1 && (
                    <motion.div
                      key="step-1"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base font-semibold">Побачте мерч на людині</h2>
                          <p className="text-[11px] text-muted-foreground">AI покаже, як виглядає ваш дизайн у реальному житті</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрити" className="h-8 w-8 -mr-2 shrink-0 ml-2">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>


                      {limitReached ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                          {loading ? (
                            <>
                              <GeneratingThumbnail onClick={() => setStep(2)} />
                              <p className="text-sm text-muted-foreground">Генерація вже запущена</p>
                            </>
                          ) : (
                            <>
                              {previewImage && (
                                <img src={previewImage} alt="Результат" className="w-40 h-40 rounded-xl object-cover border border-border shadow-sm" />
                              )}
                              <p className="text-sm font-medium text-foreground">Ви вже використали безкоштовну генерацію для цього товару.</p>
                              <Button className="w-full" onClick={() => setStep(2)}>
                                Переглянути результат
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "selfie" | "prompt")} className="w-full mt-2">
                            <TabsList className="w-full grid grid-cols-2">
                              <TabsTrigger value="selfie" className="text-xs">Своє фото</TabsTrigger>
                              <TabsTrigger value="prompt" className="text-xs">Сцена</TabsTrigger>
                            </TabsList>
                          </Tabs>

                          <div className="min-h-[140px]">
                            {activeTab === "selfie" && (
                              <div className="space-y-4 pt-1">
                                <SelfieUpload
                                  selfieDataUrl={selfieDataUrl}
                                  onUpload={setSelfieDataUrl}
                                  onClear={() => setSelfieDataUrl(null)}
                                />
                              </div>
                            )}

                            {activeTab === "prompt" && (
                              <div className="space-y-3 pt-1">
                                <textarea
                                  aria-label="Опис сцени для генерації"
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                                  placeholder="Опишіть сцену або оберіть пресет…"
                                  rows={3}
                                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <RotatingPresets onSelect={setPrompt} selected={prompt} />
                              </div>
                            )}
                          </div>

                          {showHint && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Активна сторона порожня. Натхнення буде братись зі сторони «{otherSideWithLayers!.side}».
                            </p>
                          )}

                          {aiQuota.isExhausted && (
                            <p className="text-xs text-destructive mt-2 text-center">
                              Ви використали {aiQuota.limit} безкоштовні генерації
                            </p>
                          )}

                          <Button
                            className="w-full mt-4"
                            disabled={!canGenerate}
                            onClick={handleGenerateClick}
                          >
                            {loading ? "Генерація в процесі…" : "Згенерувати"}
                          </Button>
                        </>
                      )}
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step-2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 -ml-2">
                          <Button variant="ghost" size="icon" onClick={() => setStep(1)} aria-label="Назад" className="h-8 w-8">
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          <span className="font-semibold text-base">
                            {loading ? "Генеруємо…" : "Результат"}
                          </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрити" className="h-8 w-8 -mr-2">
                          <X className="h-5 w-5" />
                        </Button>
                      </div>

                      <div className="w-full aspect-square rounded-xl border border-border bg-muted flex flex-col items-center justify-center overflow-hidden">
                        {loading ? (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center gap-4 p-4 w-full"
                          >
                            <MatrixIconGrid />
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={progressIndex}
                                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-sm font-medium text-muted-foreground"
                              >
                                {PROGRESS_PHRASES[progressIndex % PROGRESS_PHRASES.length]}
                              </motion.p>
                            </AnimatePresence>
                          </motion.div>
                        ) : previewImage ? (
                          <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            src={previewImage} alt="Generated mockup" className="w-full h-full object-cover"
                          />
                        ) : error ? (
                          <div className="p-4 text-center text-sm text-destructive bg-destructive/10 rounded-md m-4">
                            {error}
                            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setStep(1)}>
                              Спробувати знову
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

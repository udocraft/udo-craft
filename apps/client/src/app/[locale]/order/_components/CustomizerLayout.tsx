"use client";

import React from "react";
import { ArrowLeft, Layers, LayoutList, Loader2, Palette, Pencil, PackageOpen, Type, Upload } from "lucide-react";
import { type SidebarTabId } from "@udo-craft/shared";
import { CustomizerMobileSheet } from "./CustomizerMobileSheet";

// ── Mobile tab config ─────────────────────────────────────────────────────

const MOBILE_TABS: { id: SidebarTabId; label: string; Icon: React.ElementType }[] = [
  { id: "prints",  label: "Принти",  Icon: Layers      },
  { id: "draw",    label: "Малюнок", Icon: Pencil      },
  { id: "text",    label: "Текст",   Icon: Type        },
  { id: "upload",  label: "Файл",    Icon: Upload      },
  { id: "layers",  label: "Шари",    Icon: LayoutList  },
];

// ── Props ─────────────────────────────────────────────────────────────────

interface CustomizerLayoutProps {
  productName: string;
  total: number;
  mobileSheet: "config" | "price" | null;
  setMobileSheet: (v: "config" | "price" | null) => void;
  addingToCart: boolean;
  removingBg?: boolean;
  onCancelRemoveBg?: () => void;
  sidebar?: React.ReactNode;
  panel?: React.ReactNode;
  activeTab?: SidebarTabId | null;
  onTabChange?: (tab: SidebarTabId | null) => void;
  onPriceOpen?: () => void;
  /** @deprecated use sidebar + panel instead */
  leftPanel?: React.ReactNode;
  canvas: React.ReactNode;
  rightPanel: React.ReactNode;
  stickyButton?: React.ReactNode;
  /** Mobile sheets rendered inside the layout stacking context */
  mobileTabSheet?: React.ReactNode;
  mobilePriceSheet?: React.ReactNode;
  onClose: () => void;
  /** Layer count for badge on Шари tab */
  layerCount?: number;
}

// ── Component ─────────────────────────────────────────────────────────────

export function CustomizerLayout({
  productName, total, mobileSheet, setMobileSheet, addingToCart, removingBg, onCancelRemoveBg,
  sidebar, panel, activeTab, onTabChange, onPriceOpen,
  leftPanel, canvas, rightPanel, stickyButton,
  mobileTabSheet, mobilePriceSheet,
  onClose, layerCount = 0,
}: CustomizerLayoutProps) {
  const isNewLayout = sidebar !== undefined || panel !== undefined;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {isNewLayout ? (
        /* ── New 4-column desktop layout ── */
        <div className="flex flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[56px_auto_1fr_280px]">
          {/* 56px icon sidebar — desktop only */}
          <div className="hidden lg:flex lg:flex-col h-full border-r border-border bg-card overflow-hidden">
            {sidebar}
          </div>

          {/* Animated panel column — desktop only */}
          <div className="hidden lg:block h-full overflow-hidden">
            {panel}
          </div>

          {/* Canvas */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start lg:justify-center p-3 lg:p-6 bg-muted/40">
            <div className="lg:hidden w-full h-11 mb-3 flex items-center justify-between bg-card rounded-xl px-3 border border-border">
              <button
                onClick={() => { if (!confirm("Повернутися? Незбережені зміни буде втрачено.")) return; onClose(); }}
                className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <ArrowLeft className="size-3.5" /> Назад
              </button>
              <p className="text-xs font-semibold truncate max-w-[140px]">{productName}</p>
              <p className="text-xs font-bold text-primary shrink-0">{total.toFixed(0)} ₴</p>
            </div>
            {canvas}
          </div>

          {/* Right panel — desktop */}
          <div className="hidden lg:flex lg:flex-col h-full overflow-hidden border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
              <div className="space-y-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Тираж та ціна</p>
                {rightPanel}
              </div>
            </div>
            {stickyButton && (
              <div className="shrink-0 border-t border-border bg-card p-4">
                {stickyButton}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Legacy 3-column desktop layout ── */
        <div className="flex flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[280px_1fr_280px]">
          <div className="hidden lg:flex lg:flex-col h-full overflow-y-auto border-r border-border bg-card p-4">
            {leftPanel}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start lg:justify-center p-3 lg:p-6 bg-muted/40">
            <div className="lg:hidden w-full h-11 mb-3 flex items-center justify-between bg-card rounded-xl px-3 border border-border">
              <button
                onClick={() => { if (!confirm("Повернутися? Незбережені зміни буде втрачено.")) return; onClose(); }}
                className="cursor-pointer flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <ArrowLeft className="size-3.5" /> Назад
              </button>
              <p className="text-xs font-semibold truncate max-w-[140px]">{productName}</p>
              <p className="text-xs font-bold text-primary shrink-0">{total.toFixed(0)} ₴</p>
            </div>
            {canvas}
          </div>
          <div className="hidden lg:flex lg:flex-col h-full overflow-hidden border-l border-border bg-card">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
              <div className="space-y-5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Тираж та ціна</p>
                {rightPanel}
              </div>
            </div>
            {stickyButton && (
              <div className="shrink-0 border-t border-border bg-card p-4">
                {stickyButton}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      {isNewLayout ? (
        /* New layout: 5 tool tabs + Тираж */
        <div className="lg:hidden relative z-[9999] shrink-0 border-t border-border bg-card overflow-hidden">
          <div className="flex">
            {MOBILE_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(activeTab === tab.id ? null : tab.id)}
                aria-label={tab.label}
                aria-pressed={activeTab === tab.id}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${activeTab === tab.id ? "text-primary border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
              >
                <span className="relative">
                  <tab.Icon className="size-4" />
                  {tab.id === "layers" && layerCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center px-0.5 leading-none">
                      {layerCount > 9 ? "9+" : layerCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            ))}
            <button
              onClick={onPriceOpen}
              aria-label="Тираж та ціна"
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors min-h-[44px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <PackageOpen className="size-4" />
              Тираж
            </button>
          </div>
        </div>
      ) : (
        /* Legacy layout: Налаштування + Тираж */
        <div className="lg:hidden relative z-[9999] shrink-0 border-t border-border bg-card h-14">
          <div className="flex h-full">
            <button
              onClick={() => setMobileSheet(mobileSheet === "config" ? null : "config")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${mobileSheet === "config" ? "text-primary border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
            >
              <Palette className="size-4" />
              Налаштування
            </button>
            <button
              onClick={() => setMobileSheet(mobileSheet === "price" ? null : "price")}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${mobileSheet === "price" ? "text-primary border-t-2 border-primary -mt-px" : "text-muted-foreground"}`}
            >
              <PackageOpen className="size-4" />
              Тираж та ціна
            </button>
          </div>
        </div>
      )}

      {isNewLayout ? (
        /* New layout: mobile sheets passed as props */
        <>
          {mobileTabSheet}
          {mobilePriceSheet}
        </>
      ) : (
        <CustomizerMobileSheet
          activeSheet={mobileSheet}
          onClose={() => setMobileSheet(null)}
          configContent={leftPanel}
          priceContent={rightPanel}
        />
      )}

      {addingToCart && (
        <div className="fixed inset-0 z-[10001] bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-xl text-sm font-semibold">
            <Loader2 className="size-4 animate-spin text-primary" />
            Додаємо...
          </div>
        </div>
      )}
      {removingBg && (
        <div className="fixed inset-0 z-[10001] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-6 shadow-2xl max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
            <Loader2 className="size-8 animate-spin text-primary" />
            <div className="space-y-1">
              <p className="text-base font-bold">Видалення фону з допомогою AI</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Будь ласка, зачекайте. Обробка зображення високої якості може зайняти <span className="font-semibold text-foreground">15–20 секунд</span>.
              </p>
            </div>
            {onCancelRemoveBg && (
              <button
                type="button"
                onClick={onCancelRemoveBg}
                className="mt-2 h-9 px-4 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Скасувати
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

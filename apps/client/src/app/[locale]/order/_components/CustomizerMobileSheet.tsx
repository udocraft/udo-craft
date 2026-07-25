"use client";

import React from "react";
import { X } from "lucide-react";

interface CustomizerMobileSheetProps {
  activeSheet: "config" | "price" | null;
  onClose: () => void;
  configContent: React.ReactNode;
  priceContent: React.ReactNode;
}

export function CustomizerMobileSheet({
  activeSheet, onClose, configContent, priceContent,
}: CustomizerMobileSheetProps) {
  if (!activeSheet) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-[10000] flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-background rounded-t-2xl max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3 shrink-0">
          <p className="text-sm font-semibold">
            {activeSheet === "config" ? "Налаштування товару" : "Тираж та ціна"}
          </p>
          <button
            onClick={onClose}
            className="size-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-[env(safe-area-inset-bottom,24px)] [&>div]:pb-8">
          {activeSheet === "config" ? configContent : priceContent}
        </div>
      </div>
    </div>
  );
}

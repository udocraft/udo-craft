"use client";

import { Loader2 } from "lucide-react";

export function LoadingScreen({ text = "Завантаження..." }: { text?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-3"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--tg-theme-button-color)' }} />
      <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>{text}</p>
    </div>
  );
}

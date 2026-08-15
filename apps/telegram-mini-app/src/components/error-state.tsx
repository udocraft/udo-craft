"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Щось пішло не так", onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[40vh] gap-3 p-8 text-center"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
    >
      <AlertTriangle className="w-10 h-10" style={{ color: 'var(--tg-theme-hint-color)' }} />
      <p className="text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Спробувати знову
        </button>
      )}
    </div>
  );
}

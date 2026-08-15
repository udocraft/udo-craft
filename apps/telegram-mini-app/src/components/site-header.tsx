"use client";

import { ShoppingCart, ArrowLeft } from "lucide-react";
import { useTelegram } from "@/hooks/use-telegram";
import { useCart } from "@/hooks/use-cart";
import { useRouter } from "next/navigation";

interface SiteHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showCart?: boolean;
  rightAction?: React.ReactNode;
}

export function SiteHeader({ title, subtitle, showBack, showCart = true, rightAction }: SiteHeaderProps) {
  const { tg } = useTelegram();
  const { totalItems } = useCart();
  const router = useRouter();

  return (
    <header
      className="sticky top-0 z-10 px-4 py-3 border-b"
      style={{
        backgroundColor: 'var(--tg-theme-bg-color)',
        borderColor: 'var(--tg-theme-hint-color)',
        opacity: 0.95,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-1 -ml-1 rounded-lg hover:opacity-70 transition-opacity shrink-0"
              style={{ color: 'var(--tg-theme-button-color)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--tg-theme-text-color)' }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs truncate" style={{ color: 'var(--tg-theme-hint-color)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightAction}
          {showCart && (
            <button
              onClick={() => router.push('/cart')}
              className="relative p-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--tg-theme-button-color)' }}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--tg-theme-button-color)',
                    color: 'var(--tg-theme-button-text-color)',
                  }}
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

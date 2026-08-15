"use client";

export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/use-telegram";
import { CheckCircle2, Package } from "lucide-react";

export default function SuccessPage() {
  const router = useRouter();
  const { tg, haptic } = useTelegram();

  useEffect(() => {
    haptic('notification');
    if (tg?.BackButton) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => router.push('/'));
    }
    return () => {
      if (tg?.BackButton) {
        tg.BackButton.offClick(() => {});
        tg.BackButton.hide();
      }
    };
  }, [tg, haptic, router]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen p-8 text-center"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      <CheckCircle2 className="w-20 h-20 mb-4" style={{ color: 'var(--tg-theme-button-color)' }} />
      <h1 className="text-2xl font-bold mb-2">Замовлення прийнято!</h1>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--tg-theme-hint-color)' }}>
        Дякуємо! Наш менеджер зв&apos;яжеться з вами найближчим часом для підтвердження деталей.
      </p>
      <div
        className="p-4 rounded-xl w-full max-w-sm mb-8 text-left"
        style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
      >
        <p className="text-sm font-medium mb-1">Що далі?</p>
        <ul className="text-xs space-y-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
          <li>1. Менеджер перевіряє наявність та терміни</li>
          <li>2. Погоджуємо макети та деталі</li>
          <li>3. Запускаємо у виробництво</li>
        </ul>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/products')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: 'var(--tg-theme-button-color)',
            color: 'var(--tg-theme-button-text-color)',
          }}
        >
          <Package className="w-4 h-4" />
          До каталогу
        </button>
      </div>
    </div>
  );
}

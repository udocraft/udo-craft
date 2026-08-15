"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/use-telegram";
import { useCart } from "@/hooks/use-cart";
import { SiteHeader } from "@/components/site-header";
import { LoadingScreen } from "@/components/loading-screen";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { tg, initDataRaw, haptic, showBackButton } = useTelegram();
  const { items, loaded, updateQuantity, removeItem, clearCart, totalCents, totalItems } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    const cleanup = showBackButton(() => router.back());
    return () => cleanup?.();
  }, [showBackButton, router]);

  const handleSubmit = useCallback(async () => {
    if (!tg || !initDataRaw || items.length === 0 || submitted.current) return;
    submitted.current = true;
    setSubmitting(true);

    const user = tg.initDataUnsafe?.user;
    const orderItems = items.map(i => ({
      product_id: i.productId,
      size: i.size,
      color: i.colorName,
      quantity: i.quantity,
      unit_price_cents: i.unitPriceCents,
    }));

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: initDataRaw,
          customerData: {
            name: user ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` : 'Telegram User',
            email: user?.username
              ? `${user.username}@telegram.placeholder`
              : `tg_${user?.id}@telegram.placeholder`,
            phone: null,
            company: null,
            message: `Замовлення через Mini App`,
            tg_username: user?.username ? `@${user.username}` : null,
          },
          totalAmountCents: totalCents,
          orderItems,
          tgChatId: user?.id ? String(user.id) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Помилка створення замовлення');

      haptic('notification');
      clearCart();
      router.push('/success');
    } catch (err) {
      haptic('impact');
      submitted.current = false;
      alert(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setSubmitting(false);
    }
  }, [tg, initDataRaw, items, totalCents, clearCart, haptic, router]);

  useEffect(() => {
    if (!loaded || items.length === 0 || !tg) return;
    tg.MainButton.setParams({
      text: submitting ? 'Відправлення...' : `Оформити — ₴${(totalCents / 100).toFixed(0)}`,
      is_active: !submitting,
      is_visible: true,
    });
    tg.MainButton.onClick(handleSubmit);
    return () => {
      tg.MainButton.offClick(handleSubmit);
      tg.MainButton.hide();
    };
  }, [loaded, items.length, totalCents, submitting, tg, handleSubmit]);

  if (!loaded) return <LoadingScreen />;

  const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      <SiteHeader title="Кошик" subtitle={`${totalItems} товарів`} showBack showCart={false} />

      <main className="flex-1 p-4 pb-24">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <ShoppingBag className="w-16 h-16" style={{ color: 'var(--tg-theme-hint-color)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Кошик порожній
            </p>
            <button
              onClick={() => router.push('/products')}
              className="px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              До каталогу
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.colorVariantId}-${item.size}-${idx}`}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <div className="flex gap-3 items-start">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <div className="w-8 h-8 rounded-full" style={{ backgroundColor: item.hexCode }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <div className="flex gap-2 text-xs mt-0.5" style={{ color: 'var(--tg-theme-hint-color)' }}>
                      <span>{item.colorName}</span>
                      <span>•</span>
                      <span>{item.size}</span>
                    </div>
                    <p className="font-bold text-sm mt-1" style={{ color: 'var(--tg-theme-button-color)' }}>
                      {fmtPrice(item.unitPriceCents * item.quantity)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        updateQuantity(item.productId, item.colorVariantId, item.size, item.quantity - 1);
                        haptic('selection');
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-medium w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      onClick={() => {
                        updateQuantity(item.productId, item.colorVariantId, item.size, item.quantity + 1);
                        haptic('selection');
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      removeItem(item.productId, item.colorVariantId, item.size);
                      haptic('impact');
                    }}
                    className="p-2 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div
              className="p-4 rounded-xl space-y-2"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--tg-theme-hint-color)' }}>Сума</span>
                <span className="font-bold">{fmtPrice(totalCents)}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Мінімальне замовлення: від 10 одиниць
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

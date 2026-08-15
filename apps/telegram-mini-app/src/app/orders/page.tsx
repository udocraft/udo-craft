"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/use-telegram";
import { SiteHeader } from "@/components/site-header";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { Package, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  status: string;
  total_amount_cents: number;
  created_at: string;
  customer_data: Record<string, unknown>;
  order_items?: Array<{
    product_id: string;
    size: string;
    color: string;
    quantity: number;
    unit_price_cents: number;
  }>;
}

const STATUS_MAP: Record<string, { label: string; icon: typeof Package; color: string }> = {
  new: { label: 'Новий', icon: AlertCircle, color: '#f59e0b' },
  in_progress: { label: 'В роботі', icon: Clock, color: '#3b82f6' },
  production: { label: 'У виробництві', icon: Package, color: '#8b5cf6' },
  completed: { label: 'Готово', icon: CheckCircle, color: '#22c55e' },
  archived: { label: 'Архів', icon: CheckCircle, color: '#6b7280' },
};

export default function OrdersPage() {
  const { tg, initDataRaw, showBackButton } = useTelegram();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cleanup = showBackButton(() => window.history.back());
    return () => cleanup?.();
  }, [showBackButton]);

  useEffect(() => {
    if (!initDataRaw) {
      setLoading(false);
      setError('Необхідна авторизація Telegram');
      return;
    }

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: initDataRaw }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [initDataRaw]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;
  const fmtDate = (date: string) => new Date(date).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      <SiteHeader title="Мої замовлення" showBack />

      <main className="flex-1 p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Package className="w-16 h-16" style={{ color: 'var(--tg-theme-hint-color)' }} />
            <p className="text-lg font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
              У вас ще немає замовлень
            </p>
            <button
              onClick={() => window.location.href = '/products'}
              className="px-6 py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--tg-theme-button-color)',
                color: 'var(--tg-theme-button-text-color)',
              }}
            >
              Зробити замовлення
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => {
              const statusInfo = STATUS_MAP[order.status] || { label: order.status, icon: Package, color: '#6b7280' };
              const StatusIcon = statusInfo.icon;
              return (
                <div
                  key={order.id}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="w-5 h-5" style={{ color: statusInfo.color }} />
                      <div>
                        <p className="text-sm font-medium">{statusInfo.label}</p>
                        <p className="text-xs" style={{ color: 'var(--tg-theme-hint-color)' }}>
                          {fmtDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-sm" style={{ color: 'var(--tg-theme-button-color)' }}>
                      {fmtPrice(order.total_amount_cents)}
                    </p>
                  </div>
                  {order.order_items && order.order_items.length > 0 && (
                    <div className="mt-2 pt-2 text-xs space-y-1" style={{ borderTop: '1px solid var(--tg-theme-hint-color)', opacity: 0.3, borderTopColor: 'var(--tg-theme-hint-color)' }}>
                      {order.order_items.map((item, idx) => (
                        <p key={idx} style={{ color: 'var(--tg-theme-hint-color)' }}>
                          {item.quantity}× {item.color}, {item.size}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

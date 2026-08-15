"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/use-telegram";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, Package, MessageCircle, ShoppingCart, Shirt, Sparkles, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  images: Record<string, string>;
}

export default function Home() {
  const { tg, user } = useTelegram();
  const { totalItems } = useCart();
  const [featured, setFeatured] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products?limit=4')
      .then(res => res.json())
      .then(data => setFeatured(data.products || []))
      .catch(() => {});
  }, []);

  const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      {/* Header */}
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold">UDO Craft</h1>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {user ? `Привіт, ${user.first_name}!` : 'Мерч та корпоративний одяг'}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/cart'}
            className="relative p-2 rounded-xl"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold flex items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'var(--tg-theme-button-color)',
                  color: 'var(--tg-theme-button-text-color)',
                }}
              >
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pb-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <a href="/products"
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <Package className="w-7 h-7" style={{ color: 'var(--tg-theme-button-color)' }} />
            <span className="text-sm font-medium">Каталог</span>
          </a>
          <a href="/products"
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <Sparkles className="w-7 h-7" style={{ color: 'var(--tg-theme-button-color)' }} />
            <span className="text-sm font-medium">Замовити</span>
          </a>
          <a href="/cart"
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <ShoppingBag className="w-7 h-7" style={{ color: 'var(--tg-theme-button-color)' }} />
            <span className="text-sm font-medium">Кошик</span>
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); if (tg) tg.close(); }}
            className="flex flex-col items-center gap-1.5 p-4 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
          >
            <MessageCircle className="w-7 h-7" style={{ color: 'var(--tg-theme-button-color)' }} />
            <span className="text-sm font-medium">Чат</span>
          </a>
        </div>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Популярні товари</h2>
              <a href="/products" className="text-xs flex items-center gap-0.5" style={{ color: 'var(--tg-theme-button-color)' }}>
                Всі <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
              {featured.map(p => (
                <a
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="snap-start shrink-0 w-36 rounded-xl overflow-hidden transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  <div className="aspect-square flex items-center justify-center p-3"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
                  >
                    {p.images?.front ? (
                      <img src={p.images.front} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <Shirt className="w-10 h-10" style={{ color: 'var(--tg-theme-hint-color)' }} />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--tg-theme-button-color)' }}>
                      {fmtPrice(p.base_price_cents)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Info */}
        <div
          className="p-4 rounded-xl space-y-2"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
        >
          <h2 className="font-semibold">Про нас</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Виробництво мерчу та корпоративного одягу під ключ. Футболки, худі, кепки, рюкзаки — з вашим дизайном.
          </p>
          <div className="flex gap-4 text-xs pt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
            <span>🎨 DTF / вишивка</span>
            <span>📦 Від 10 од.</span>
            <span>🚚 7–14 днів</span>
          </div>
        </div>
      </main>
    </div>
  );
}

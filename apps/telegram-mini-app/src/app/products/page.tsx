"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/use-telegram";
import { SiteHeader } from "@/components/site-header";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { Shirt, CircleDot, Package, Search } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price_cents: number;
  description?: string;
  images: Record<string, string>;
  product_color_variants: Array<{
    id: string;
    name: string;
    hex_code: string;
    images: Record<string, string>;
  }>;
  marketing_meta?: {
    min_order_qty?: number;
  };
}

export default function ProductsPage() {
  const { showBackButton } = useTelegram();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cleanup = showBackButton(() => window.history.back());
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
    return () => cleanup?.();
  }, [showBackButton]);

  const getProductIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('футболка') || lower.includes('t-shirt') || lower.includes('майк')) return Shirt;
    return Package;
  };

  const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      <SiteHeader title="Каталог" subtitle={`${products.length} товарів`} />

      <main className="flex-1 px-4 pb-4 space-y-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
        >
          <Search className="w-4 h-4" style={{ color: 'var(--tg-theme-hint-color)' }} />
          <input
            type="text"
            placeholder="Пошук товарів..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm flex-1 outline-none"
            style={{ color: 'var(--tg-theme-text-color)' }}
          />
        </div>

        {/* Products Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--tg-theme-hint-color)' }}>
            {search ? 'Нічого не знайдено' : 'Товари не знайдено'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(product => {
              const Icon = getProductIcon(product.name);
              const firstColor = product.product_color_variants?.[0];
              return (
                <a
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="rounded-xl overflow-hidden transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  <div
                    className="aspect-square flex items-center justify-center p-4"
                    style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}
                  >
                    {firstColor?.images?.front ? (
                      <img src={firstColor.images.front} alt={product.name} className="w-full h-full object-contain" />
                    ) : product.images?.front ? (
                      <img src={product.images.front} alt={product.name} className="w-full h-full object-contain" />
                    ) : (
                      <Icon className="w-12 h-12" style={{ color: 'var(--tg-theme-hint-color)' }} />
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--tg-theme-button-color)' }}>
                      {fmtPrice(product.base_price_cents)}
                    </p>
                    {product.product_color_variants && product.product_color_variants.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {product.product_color_variants.slice(0, 4).map(v => (
                          <div
                            key={v.id}
                            className="w-3.5 h-3.5 rounded-full border"
                            style={{
                              backgroundColor: v.hex_code,
                              borderColor: 'var(--tg-theme-hint-color)',
                            }}
                          />
                        ))}
                        {product.product_color_variants.length > 4 && (
                          <span className="text-[10px]" style={{ color: 'var(--tg-theme-hint-color)' }}>
                            +{product.product_color_variants.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    {product.marketing_meta?.min_order_qty && (
                      <p className="text-[10px] mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                        Від {product.marketing_meta.min_order_qty} шт.
                      </p>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

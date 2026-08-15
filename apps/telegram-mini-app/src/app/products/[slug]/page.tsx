"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/use-telegram";
import { useCart } from "@/hooks/use-cart";
import { SiteHeader } from "@/components/site-header";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { Minus, Plus, Check } from "lucide-react";

interface ColorVariant {
  id: string;
  name: string;
  hex_code: string;
  images: Record<string, string>;
  material?: { name: string };
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price_cents: number;
  available_sizes: string[];
  images: Record<string, string>;
  product_color_variants: ColorVariant[];
  marketing_meta?: {
    min_order_qty?: number;
    delivery_min_days?: number;
    delivery_max_days?: number;
    file_guidelines?: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { tg, haptic, showMainButton, showBackButton } = useTelegram();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);

  const slug = params?.slug as string;

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/products?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const p = data.product || data.products?.[0];
        if (!p) throw new Error("Товар не знайдено");
        setProduct(p);
        if (p.product_color_variants?.length > 0) {
          setSelectedColor(p.product_color_variants[0].id);
        }
        if (p.available_sizes?.length > 0) {
          setSelectedSize(p.available_sizes[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [slug]);

  const selectedVariant = product?.product_color_variants?.find(v => v.id === selectedColor);
  const minQty = product?.marketing_meta?.min_order_qty || 1;
  const unitPrice = product?.base_price_cents || 0;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = useCallback(() => {
    if (!product || !selectedColor || !selectedSize) return;
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      colorVariantId: selectedColor,
      colorName: selectedVariant?.name || "",
      hexCode: selectedVariant?.hex_code || "#000",
      size: selectedSize,
      quantity,
      unitPriceCents: unitPrice,
      imageUrl: selectedVariant?.images?.front || product.images?.front || "",
    });
    haptic('notification');
    router.push('/cart');
  }, [product, selectedColor, selectedSize, quantity, unitPrice, selectedVariant, addItem, haptic, router]);

  useEffect(() => {
    if (!product || loading) return;
    const cleanup = showMainButton(
      `Додати до кошика — ₴${(totalPrice / 100).toFixed(0)}`,
      handleAddToCart
    );
    return () => cleanup?.();
  }, [product, loading, totalPrice, handleAddToCart, showMainButton]);

  useEffect(() => {
    const cleanup = showBackButton(() => router.back());
    return () => cleanup?.();
  }, [showBackButton, router]);

  if (loading) return <LoadingScreen />;
  if (error || !product) return <ErrorState message={error || "Товар не знайдено"} onRetry={() => router.back()} />;

  const fmtPrice = (cents: number) => `₴${(cents / 100).toFixed(0)}`;

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-text-color)' }}
    >
      <SiteHeader title={product.name} showBack showCart={false} />

      <main className="flex-1">
        {/* Product Image */}
        <div
          className="w-full aspect-square flex items-center justify-center p-8"
          style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
        >
          {selectedVariant?.images?.front ? (
            <img
              src={selectedVariant.images.front}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : product.images?.front ? (
            <img
              src={product.images.front}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-24 h-24 rounded-full" style={{ backgroundColor: selectedVariant?.hex_code || '#ccc' }} />
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-2xl font-bold mt-1" style={{ color: 'var(--tg-theme-button-color)' }}>
              {fmtPrice(unitPrice)}
            </p>
            {product.marketing_meta?.delivery_min_days && (
              <p className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
                Виробництво: {product.marketing_meta.delivery_min_days}–{product.marketing_meta.delivery_max_days} днів
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tg-theme-hint-color)' }}>
              {product.description}
            </p>
          )}

          {/* Color Selection */}
          {product.product_color_variants?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Колір: {selectedVariant?.name}</p>
              <div className="flex flex-wrap gap-2">
                {product.product_color_variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedColor(v.id); haptic('selection'); }}
                    className="relative w-10 h-10 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: v.hex_code,
                      borderColor: selectedColor === v.id ? 'var(--tg-theme-button-color)' : 'transparent',
                      transform: selectedColor === v.id ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {selectedColor === v.id && (
                      <Check className="absolute inset-0 m-auto w-4 h-4" style={{
                        color: ['#fff', '#fefefe', '#f5f5f5'].includes(v.hex_code?.toLowerCase()) ? '#000' : '#fff'
                      }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.available_sizes?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Розмір: {selectedSize}</p>
              <div className="flex flex-wrap gap-2">
                {product.available_sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => { setSelectedSize(size); haptic('selection'); }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: selectedSize === size
                        ? 'var(--tg-theme-button-color)'
                        : 'var(--tg-theme-secondary-bg-color)',
                      color: selectedSize === size
                        ? 'var(--tg-theme-button-text-color)'
                        : 'var(--tg-theme-text-color)',
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium mb-2">Кількість (мін. {minQty})</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setQuantity(Math.max(minQty, quantity - 1)); haptic('selection'); }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                disabled={quantity <= minQty}
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-xl font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => { setQuantity(quantity + 1); haptic('selection'); }}
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* File Guidelines */}
          {product.marketing_meta?.file_guidelines && (
            <div
              className="p-3 rounded-xl text-xs leading-relaxed"
              style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
            >
              <p className="font-medium mb-1">Вимоги до файлів:</p>
              <p style={{ color: 'var(--tg-theme-hint-color)' }}>{product.marketing_meta.file_guidelines}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import React from "react";
import type { Product, Material, ProductColorVariant } from "@udo-craft/shared";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

interface ProductGridProps {
  products: ProductWithConfig[];
  variants: ProductColorVariant[];
  materials: Material[];
  categories: { id: string; name: string }[];
  activeCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  onCustomize: (product: ProductWithConfig, size: string | null, color: string | null) => void;
  onAddWithoutPrint: (product: ProductWithConfig, size: string | null, color: string | null, variant: ProductColorVariant | null) => void;
}

export function ProductGrid({
  products, variants, materials, categories, activeCategory,
  onCategoryChange, onCustomize, onAddWithoutPrint,
}: ProductGridProps) {
  const filtered = products.filter((p) => !activeCategory || (p as any).category_id === activeCategory);

  return (
    <>
      <div>
        <h2 className="text-xl font-bold mb-1">Виберіть товари</h2>
        <p className="text-sm text-muted-foreground">Натисніть на товар, щоб налаштувати та додати до замовлення</p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button onClick={() => onCategoryChange(null)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${activeCategory === null ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-foreground/40"}`}>
            Всі
          </button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => onCategoryChange(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-foreground/40"}`}>
              {cat.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="text-3xl mb-3">🧺</p>
            <p className="text-muted-foreground text-sm font-medium">У цій категорії поки немає товарів</p>
          </div>
        ) : filtered.map((product) => {
          const prodVariants = variants.filter((v) => v.product_id === product.id);
          return (
            <ProductCardDetailed
              key={product.id}
              product={product}
              colorVariants={prodVariants}
              materials={materials}
              onCustomize={(prod, size, color) => {
                window.scrollTo({ top: 0, behavior: "auto" });
                onCustomize(prod as ProductWithConfig, size, color);
              }}
              onAddWithoutPrint={(prod, size, color, variant) => {
                onAddWithoutPrint(prod as ProductWithConfig, size, color, variant);
              }}
            />
          );
        })}
      </div>
    </>
  );
}

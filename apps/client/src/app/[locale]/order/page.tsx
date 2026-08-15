"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, PrintZone, Material, ProductColorVariant } from "@udo-craft/shared";
import { resolveProductImages, getCustomizableImages } from "@udo-craft/shared";
import { LogoLoader } from "@udo-craft/ui";

// Simple inline loader to avoid hydration issues
function SimpleLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
import { OrderPageInner } from "./_main";

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

interface SizeChart { id: string; name: string; rows: Record<string, string>[]; }

function OrderPageLoader() {
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<ProductWithConfig[]>([]);
  const [sizeCharts, setSizeCharts] = useState<Record<string, SizeChart>>({});
  const [printZones, setPrintZones] = useState<Record<string, { front?: PrintZone | null; back?: PrintZone | null }>>({});
  const [materials, setMaterials] = useState<Material[]>([]);
  const [variants, setVariants] = useState<ProductColorVariant[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const jsonOrFallback = async <T,>(url: string, fallback: T): Promise<T> => {
      try {
        const res = await fetch(url);
        if (!res.ok) return fallback;
        return (await res.json()) as T;
      } catch {
        return fallback;
      }
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);

      const [prods, charts, zones, mats, vars, cats] = await Promise.all([
        jsonOrFallback<ProductWithConfig[]>("/api/products?active=true", []),
        jsonOrFallback<SizeChart[]>("/api/size-charts", []),
        jsonOrFallback<PrintZone[]>("/api/print-zones", []),
        jsonOrFallback<Material[]>("/api/materials", []),
        jsonOrFallback<ProductColorVariant[]>("/api/product-color-variants", []),
        jsonOrFallback<{ id: string; name: string }[]>("/api/categories", []),
      ]);

      if (cancelled) return;

      const prodList = prods || [];
      setProducts(prodList);
      setMaterials(mats || []);
      setVariants(vars || []);
      setCategories(cats || []);

      const map: Record<string, SizeChart> = {};
      (charts || []).forEach((c) => { map[c.id] = c; });
      setSizeCharts(map);

      const zoneMap: Record<string, { front?: PrintZone | null; back?: PrintZone | null }> = {};
      prodList.forEach((p) => { zoneMap[p.id] = {}; });
      (zones || []).forEach((z) => {
        if (!zoneMap[z.product_id]) zoneMap[z.product_id] = {};
        const side = (z as any).side as "front" | "back";
        if (!zoneMap[z.product_id][side]) zoneMap[z.product_id][side] = z;
      });
      setPrintZones(zoneMap);
      setLoading(false);
    };
    load().catch(() => {
      if (cancelled) return;
      setLoadError("Не вдалося завантажити каталог. Спробуйте оновити сторінку.");
      setLoading(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void searchParams;

  return (
    <OrderPageInner
      products={products}
      sizeCharts={sizeCharts}
      printZones={printZones}
      materials={materials}
      variants={variants}
      categories={categories}
      loading={loading}
      loadError={loadError}
    />
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<SimpleLoader />}>
      <OrderPageLoader />
    </Suspense>
  );
}

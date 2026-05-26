"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Product, PrintZone, Material, ProductColorVariant } from "@udo-craft/shared";
import { resolveProductImages, getCustomizableImages } from "@udo-craft/shared";
import { LogoLoader } from "@udo-craft/ui";
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

  useEffect(() => {
    const load = async () => {
      const [{ data: prods }, chartsRes, zonesRes, { data: mats }, { data: vars }] = await Promise.all([
        fetch("/api/products?active=true").then(async (r) => ({ data: r.ok ? await r.json() : [] })),
        fetch("/api/size-charts"),
        fetch("/api/print-zones").then(async (r) => ({ data: r.ok ? await r.json() : [] })),
        fetch("/api/materials").then(async (r) => ({ data: r.ok ? await r.json() : [] })),
        fetch("/api/product-color-variants").then(async (r) => ({ data: r.ok ? await r.json() : [] })),
      ]);

      const prodList = (prods || []) as ProductWithConfig[];
      setProducts(prodList);
      setMaterials((mats || []) as Material[]);
      setVariants((vars || []) as ProductColorVariant[]);

      const catsRes = await fetch("/api/categories");
      const cats = catsRes.ok ? await catsRes.json() : [];
      setCategories((cats || []) as { id: string; name: string }[]);

      if (chartsRes.ok) {
        const charts: SizeChart[] = await chartsRes.json();
        const map: Record<string, SizeChart> = {};
        charts.forEach((c) => { map[c.id] = c; });
        setSizeCharts(map);
      }

      const zoneMap: Record<string, { front?: PrintZone | null; back?: PrintZone | null }> = {};
      prodList.forEach((p) => { zoneMap[p.id] = {}; });
      ((zonesRes.data || []) as PrintZone[]).forEach((z) => {
        if (!zoneMap[z.product_id]) zoneMap[z.product_id] = {};
        const side = (z as any).side as "front" | "back";
        if (!zoneMap[z.product_id][side]) zoneMap[z.product_id][side] = z;
      });
      setPrintZones(zoneMap);
      setLoading(false);
    };
    load();
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
    />
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<LogoLoader />}>
      <OrderPageLoader />
    </Suspense>
  );
}

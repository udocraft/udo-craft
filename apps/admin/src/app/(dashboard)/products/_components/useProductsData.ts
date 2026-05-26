"use client";

import { useState, useCallback, useEffect } from "react";
import type { ProductImage, ProductMarketingMeta } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SizeChart {
  id: string;
  name: string;
  rows: Record<string, string>[];
}

export interface PrintArea {
  id: string;
  name: string;
  label: string;
  width_mm: number;
  height_mm: number;
  price_add_cents: number;
  description?: string;
  is_active?: boolean;
  allowed_print_types?: string[];
  pricing_grid?: Array<{
    print_type: string;
    size_label: string;
    size_min_cm: number;
    size_max_cm: number;
    qty_tiers: Array<{ min_qty: number; price_cents: number }>;
  }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  image_url?: string;
}

export interface Material {
  id: string;
  name: string;
  hex_code: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price_cents: number;
  images: Record<string, string>;
  is_active: boolean;
  is_customizable: boolean;
  available_sizes: string[];
  size_chart_id?: string | null;
  print_area_ids?: string[];
  category_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
  marketing_meta?: ProductMarketingMeta;
  product_images?: ProductImage[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProductsData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
  const [printAreas, setPrintAreas] = useState<PrintArea[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch everything in one shot — called once on mount.
  // Tab switches do NOT call this again; data stays in memory.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, cat, mat, sc, pa] = await Promise.all([
        fetch("/api/products").then(r => r.ok ? r.json() : []),
        fetch("/api/categories").then(r => r.ok ? r.json() : []),
        fetch("/api/materials").then(r => r.ok ? r.json() : []),
        fetch("/api/size-charts").then(r => r.ok ? r.json() : []),
        fetch("/api/print-areas").then(r => r.ok ? r.json() : []),
      ]);
      setProducts(p);
      setCategories(cat);
      setMaterials(mat);
      setSizeCharts(sc);
      setPrintAreas(pa);
    } finally {
      setLoading(false);
    }
  }, []);

  // Lightweight refresh — only re-fetches products (after create/update/delete)
  const refreshProducts = useCallback(async () => {
    const r = await fetch("/api/products");
    if (r.ok) setProducts(await r.json());
  }, []);

  // Fetch once on mount; no dependency on tab state so tab switches are free
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    products,
    categories,
    materials,
    sizeCharts,
    printAreas,
    loading,
    refresh: fetchAll,
    refreshProducts,
  };
}

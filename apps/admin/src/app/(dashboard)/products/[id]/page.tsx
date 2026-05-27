"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardPage } from "@/components/dashboard-page";
import { ProductForm, type ProductFormData } from "../_components/ProductForm";
import type { ProductImage, ProductMarketingMeta } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price_cents: number;
  is_active: boolean;
  is_customizable: boolean;
  category_id?: string | null;
  size_chart_id?: string | null;
  print_area_ids?: string[];
  product_images?: ProductImage[];
  discount_grid?: { qty: number; discount_pct: number }[];
  marketing_meta?: ProductMarketingMeta;
}

interface Category { id: string; name: string; slug: string; is_active: boolean; sort_order: number; }
interface SizeChart { id: string; name: string; rows: Record<string, string>[]; image_url?: string | null; }
interface PrintArea { id: string; name: string; label: string; }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
  const [printAreas, setPrintAreas] = useState<PrintArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, categoriesRes, sizeChartsRes, printAreasRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch("/api/categories"),
        fetch("/api/size-charts"),
        fetch("/api/print-areas"),
      ]);

      if (!productRes.ok) {
        toast.error("Товар не знайдено");
        router.push("/products");
        return;
      }

      const [productData, categoriesData, sizeChartsData, printAreasData] = await Promise.all([
        productRes.json(),
        categoriesRes.ok ? categoriesRes.json() : [],
        sizeChartsRes.ok ? sizeChartsRes.json() : [],
        printAreasRes.ok ? printAreasRes.json() : [],
      ]);

      setProduct(productData);
      setCategories(categoriesData);
      setSizeCharts(sizeChartsData);
      setPrintAreas(printAreasData);
    } catch {
      toast.error("Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Unsaved changes — browser unload ──────────────────────────────────────

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка збереження");
      }
      const updated = await res.json();
      setProduct(updated);
      setIsDirty(false);
      toast.success("Товар збережено");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Помилка видалення");
      toast.success("Товар видалено");
      setIsDirty(false);
      router.push("/products");
    } catch {
      toast.error("Помилка видалення");
      setDeleting(false);
    }
  };

  // ── Trigger form submit ────────────────────────────────────────────────────

  const triggerSave = () => {
    document.getElementById("product-form-submit")?.click();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <DashboardPage
      eyebrow="Каталог"
      title={product.name}
      subtitle={isDirty ? "Незбережені зміни" : undefined}
      contentClassName="px-4 py-6 md:px-6"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => router.push("/catalog?tab=products")}>
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Видалити
          </Button>
          <Button size="sm" onClick={triggerSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Зберегти
          </Button>
        </>
      }
    >
        <ProductForm
          product={product}
          categories={categories}
          sizeCharts={sizeCharts}
          printAreas={printAreas}
          onSave={handleSave}
          onChange={() => setIsDirty(true)}
          saving={saving}
        />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити товар?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія незворотна. Товар «{product.name}» буде видалено разом із усіма варіантами кольорів.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPage>
  );
}

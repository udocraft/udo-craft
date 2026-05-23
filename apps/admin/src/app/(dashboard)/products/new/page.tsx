"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DashboardPage } from "@/components/dashboard-page";
import { ProductForm, type ProductFormData } from "../_components/ProductForm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category { id: string; name: string; slug: string; is_active: boolean; sort_order: number; }
interface SizeChart { id: string; name: string; rows: Record<string, string>[]; }
interface PrintArea { id: string; name: string; label: string; }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductNewPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [sizeCharts, setSizeCharts] = useState<SizeChart[]>([]);
  const [printAreas, setPrintAreas] = useState<PrintArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Fetch lookup data ──────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesRes, sizeChartsRes, printAreasRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/size-charts"),
          fetch("/api/print-areas"),
        ]);
        const [categoriesData, sizeChartsData, printAreasData] = await Promise.all([
          categoriesRes.ok ? categoriesRes.json() : [],
          sizeChartsRes.ok ? sizeChartsRes.json() : [],
          printAreasRes.ok ? printAreasRes.json() : [],
        ]);
        setCategories(categoriesData);
        setSizeCharts(sizeChartsData);
        setPrintAreas(printAreasData);
      } catch {
        toast.error("Помилка завантаження даних");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ── Save — create new product ──────────────────────────────────────────────

  const handleSave = async (data: ProductFormData) => {
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка збереження");
      }
      const created = await res.json();
      toast.success("Товар створено");
      router.push(`/products/${created.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Помилка збереження");
      setSaving(false);
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

  return (
    <DashboardPage
        eyebrow="Каталог"
        title="Новий товар"
        contentClassName="p-4 md:p-6"
        actions={
          <>
            <Button variant="outline" onClick={() => router.push("/products")}>
              Назад
            </Button>
            <Button onClick={triggerSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Зберегти
            </Button>
          </>
        }
      >
      <ProductForm
        categories={categories}
        sizeCharts={sizeCharts}
        printAreas={printAreas}
        onSave={handleSave}
        saving={saving}
      />
    </DashboardPage>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { useProductsData } from "./_components/useProductsData";
import { ProductsTab } from "./_components/ProductsTab";
import { CategoriesTab } from "./_components/CategoriesTab";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "products" | "categories";

const TABS = [
  { key: "products", label: "Товари" },
  { key: "categories", label: "Категорії" },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("products");

  const {
    products,
    categories,
    loading,
    refresh,
    refreshProducts,
  } = useProductsData();

  const handleToggleActive = async (product: { id: string; is_active: boolean }) => {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    refreshProducts();
  };

  return (
    <DashboardPage
      title="Товари"
      tabs={<AdminTabs tabs={TABS} value={tab} onValueChange={setTab} />}
      actions={
        tab === "products" ? (
          <Button size="sm" onClick={() => router.push("/products/new")}>
            Додати товар
          </Button>
        ) : undefined
      }
    >
        {tab === "products" && (
          <ProductsTab
            products={products}
            categories={categories}
            loading={loading}
            onRefresh={refreshProducts}
            onToggleActive={handleToggleActive}
          />
        )}

        {tab === "categories" && (
          <CategoriesTab
            categories={categories}
            onRefresh={refresh}
          />
        )}
    </DashboardPage>
  );
}

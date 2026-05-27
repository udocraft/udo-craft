"use client";

import { useCallback, useState } from "react";
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
  const [categoryCreate, setCategoryCreate] = useState<(() => void) | null>(null);

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

  const setCategoryCreateHandler = useCallback((handler: () => void) => {
    setCategoryCreate(() => handler);
  }, []);

  const createConfig = {
    products: { label: "Додати товар", onClick: () => router.push("/products/new") },
    categories: { label: "Нова категорія", onClick: categoryCreate },
  }[tab];

  return (
    <DashboardPage
      title="Каталог товарів"
      titleAccessory={<AdminTabs tabs={TABS} value={tab} onValueChange={setTab} />}
      actions={

        createConfig?.onClick ? (
          <Button size="sm" onClick={createConfig.onClick}>
            {createConfig.label}
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
            onCreateActionReady={setCategoryCreateHandler}
            showSectionAction={false}
          />
        )}
    </DashboardPage>
  );
}

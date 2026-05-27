"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { useProductsData } from "../products/_components/useProductsData";
import { ProductsTab } from "../products/_components/ProductsTab";
import { CategoriesTab } from "../products/_components/CategoriesTab";
import ColorsTab from "./_components/ColorsTab";
import SizesTab from "./_components/SizesTab";

type CatalogTab = "products" | "categories" | "colors" | "sizes";

const TABS = [
  { key: "products", label: "Товари" },
  { key: "categories", label: "Категорії" },
  { key: "colors", label: "Кольори" },
  { key: "sizes", label: "Розміри" },
] as const;

export default function CatalogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = (searchParams.get("tab") || "products") as CatalogTab;
  const [categoryCreate, setCategoryCreate] = useState<(() => void) | null>(null);
  const [colorCreate, setColorCreate] = useState<(() => void) | null>(null);
  const [sizeCreate, setSizeCreate] = useState<(() => void) | null>(null);

  const { products, categories, loading, refresh, refreshProducts } = useProductsData();

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

  const setColorCreateHandler = useCallback((handler: () => void) => {
    setColorCreate(() => handler);
  }, []);

  const setSizeCreateHandler = useCallback((handler: () => void) => {
    setSizeCreate(() => handler);
  }, []);

  const createConfig = {
    products: { label: "Додати товар", onClick: () => router.push("/products/new") },
    categories: { label: "Нова категорія", onClick: categoryCreate },
    colors: { label: "Додати колір", onClick: colorCreate },
    sizes: { label: "Нова таблиця", onClick: sizeCreate },
  }[tab];

  return (
    <DashboardPage
        title="Каталог"
        titleAccessory={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.push(`/catalog?tab=${next}`)} />}
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
              loading={loading}
              onCreateActionReady={setCategoryCreateHandler}
              showSectionAction={false}
            />
          )}
          {tab === "colors" && <ColorsTab onCreateActionReady={setColorCreateHandler} showSectionAction={false} />}
          {tab === "sizes" && <SizesTab onCreateActionReady={setSizeCreateHandler} showSectionAction={false} />}
    </DashboardPage>
  );
}

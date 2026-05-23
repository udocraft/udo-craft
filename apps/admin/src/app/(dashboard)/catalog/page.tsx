"use client";

import { useSearchParams, useRouter } from "next/navigation";
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

  const { products, categories, loading, refresh, refreshProducts } = useProductsData();

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
        title="Каталог"
        subtitle={`${products.length} товарів · ${categories.length} категорій`}
        tabs={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.push(`/catalog?tab=${next}`)} />}
        actions={
          tab === "products" ? (
            <Button
              size="sm"
              onClick={() => router.push("/products/new")}
            >
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
            <CategoriesTab categories={categories} onRefresh={refresh} loading={loading} />
          )}
          {tab === "colors" && <ColorsTab />}
          {tab === "sizes" && <SizesTab />}
    </DashboardPage>
  );
}

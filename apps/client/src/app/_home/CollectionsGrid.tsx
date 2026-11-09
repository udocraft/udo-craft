"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@udo-craft/ui";
import type { Material, ProductColorVariant } from "@udo-craft/shared";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { localizedField } from "@/lib/localized-field";
import type { HomeCategory, HomeProduct } from "./context";

const PER_PAGE = 4;

/** Client island: category filter, pager and add-to-order. */
export function CollectionsGrid({
  products,
  categories,
  materials,
  colorVariants,
}: {
  products: HomeProduct[];
  categories: HomeCategory[];
  materials: Material[];
  colorVariants: ProductColorVariant[];
}) {
  const locale = useLocale();
  const t = useTranslations("collections");
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const active = products.filter((p) => p.is_active && (category === null || p.category_id === category));
  const pages = Math.max(1, Math.ceil(active.length / PER_PAGE));
  const items = active.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const select = (id: string | null) => {
    setCategory(id);
    setPage(0);
  };

  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-control border px-4 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      selected
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
    }`;

  return (
    <div>
      {categories.length > 0 && (
        <div className="-mx-gutter mb-8 flex gap-2 overflow-x-auto px-gutter pb-1 scrollbar-hide" role="group" aria-label={t("heading")}>
          <button type="button" className={chip(category === null)} aria-pressed={category === null} onClick={() => select(null)}>
            {t("all")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={chip(category === cat.id)}
              aria-pressed={category === cat.id}
              onClick={() => select(cat.id)}
            >
              {localizedField(cat.name, cat.name_en, locale)}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="h-full">
              <ProductCardDetailed
                product={item}
                colorVariants={colorVariants.filter((v) => v.product_id === item.id)}
                materials={materials}
                onAddWithoutPrint={(product, size, color, variant) => {
                  const params = new URLSearchParams({ product: product.slug || product.id, add: "1" });
                  if (size) params.set("size", size);
                  if (color) params.set("color", color);
                  if (variant?.id) params.set("variant", variant.id);
                  router.push(`/order?${params.toString()}`);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-4" aria-label={t("heading")}>
          <Button variant="outline" size="icon" aria-label={t("prevPage")} disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {t("page", { n: page + 1 })} / {pages}
          </span>
          <Button variant="outline" size="icon" aria-label={t("nextPage")} disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}

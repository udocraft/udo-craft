"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Product, Material, ProductColorVariant } from "@udo-craft/shared";
import { ProductCardDetailed } from "@/components/ProductCardDetailed";
import { FadeUp } from "@/app/_components/FadeUp";

interface Category {
  id: string; name: string; slug: string;
  sort_order: number; is_active: boolean; image_url?: string | null;
}
interface ProductWithCategory extends Product { category_id?: string | null; }

interface CollectionsSectionProps {
  products: ProductWithCategory[];
  categories: Category[];
  materials: Material[];
  colorVariants: ProductColorVariant[];
}

export function CollectionsSection({ products, categories, materials, colorVariants }: CollectionsSectionProps) {
  const t = useTranslations("collections");
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [collPage, setCollPage] = useState(0);
  const [collPerPage, setCollPerPage] = useState(2);

  useEffect(() => {
    const update = () => setCollPerPage(window.innerWidth >= 1024 ? 4 : 2);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => { setCollPage(0); }, [activeCategory, collPerPage]);

  const hasCatalog = categories.length > 0;
  const activeItems = activeCategory === null
    ? products.filter((p) => p.is_active)
    : products.filter((p) => p.category_id === activeCategory && p.is_active);

  const kw = ["футболк","худі","лонгслів","shirt","hoodie","longsleeve","tee","polo"];
  const clothingList = products.filter((p) => kw.some((k) => p.name.toLowerCase().includes(k)));
  const fallback = clothingList.length > 0 ? clothingList : products;

  const totalPages = Math.ceil(activeItems.length / collPerPage);
  const pageItems = activeItems.slice(collPage * collPerPage, (collPage + 1) * collPerPage);

  return (
    <section id="catalog" className="bg-background">
      {/* Section header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="w-full px-5 sm:px-8 lg:px-16">
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black tracking-tight">{t("heading")}</h2>
            </div>
            <Link href="/order" className="group flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-200 underline underline-offset-4">
              {t("allProducts")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </Link>
          </div>

          {hasCatalog && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4">
              <button
                onClick={() => { setActiveCategory(null); setCollPage(0); }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  activeCategory === null
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {t("all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setCollPage(0); }}
                  className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    activeCategory === cat.id
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-3.5 h-3.5 rounded-full object-cover" />}
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product grid */}
      <div className="w-full px-5 sm:px-8 lg:px-16 py-10">
        <AnimatePresence mode="wait">
          {hasCatalog ? (
            activeItems.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-24">
                <p className="text-5xl mb-4">🧺</p>
                <p className="text-muted-foreground text-sm font-medium">{t("empty")}</p>
              </motion.div>
            ) : (
              <motion.div key={activeCategory ?? "all"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-stretch">
                  {pageItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full"
                    >
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
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-12">
                    <button onClick={() => setCollPage((p) => Math.max(0, p - 1))} disabled={collPage === 0}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                      aria-label={t("prevPage")}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} onClick={() => setCollPage(i)} aria-label={t("page", { n: i + 1 })}
                          className="rounded-full transition-all duration-300"
                          style={{ width: i === collPage ? 24 : 8, height: 8, backgroundColor: i === collPage ? "var(--color-foreground)" : "var(--color-border)" }} />
                      ))}
                    </div>
                    <button onClick={() => setCollPage((p) => Math.min(totalPages - 1, p + 1))} disabled={collPage === totalPages - 1}
                      className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                      aria-label={t("nextPage")}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                )}
              </motion.div>
            )
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {fallback.slice(0, collPerPage).map((p) => (
                <ProductCardDetailed key={p.id} product={p}
                  onAddWithoutPrint={(product) => {
                    const params = new URLSearchParams({ product: product.slug || product.id, add: "1" });
                    router.push(`/order?${params.toString()}`);
                  }} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { Product, PrintZone, Material, ProductColorVariant, resolveProductImages, getCustomizableImages } from "@udo-craft/shared";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Customizer } from "./_components/Customizer";
import { DesktopCartPanel, type CartItem } from "./_components/CartSummary";
import { MobileAdminCart } from "./_components/MobileAdminCart";
import { ReviewStep } from "./_components/ReviewStep";
import { ProductCardInline } from "./_components/ProductCardInline";
import { CheckoutForm, type ContactData } from "./_components/CheckoutForm";
import { StepHeader } from "./_components/StepHeader";
import { getDiscount } from "./_lib/constants";
import { ProductQuickSearch } from "./_components/ProductQuickSearch";

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  discount_grid?: { qty: number; discount_pct: number }[];
}

interface SizeChart { id: string; name: string; rows: Record<string, string>[]; }

export default function NewOrderPage() {
  const router = useRouter();

  // Data
  const [products, setProducts] = useState<ProductWithConfig[]>([]);
  const [variants, setVariants] = useState<ProductColorVariant[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [printZonesMap, setPrintZonesMap] = useState<Record<string, { front?: PrintZone | null; back?: PrintZone | null }>>({});
  const [sizeChartsMap, setSizeChartsMap] = useState<Record<string, SizeChart | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/product-color-variants").then((r) => r.json()),
      fetch("/api/materials").then((r) => r.json()),
      fetch("/api/print-zones").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([prods, vars, mats, zones, cats]) => {
        const prodList: ProductWithConfig[] = Array.isArray(prods) ? prods : [];
        setProducts(prodList);
        setVariants(Array.isArray(vars) ? vars : []);
        setMaterials(Array.isArray(mats) ? mats : []);
        setCategories(Array.isArray(cats) ? cats.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
        const zonesMap: Record<string, { front?: PrintZone | null; back?: PrintZone | null }> = {};
        if (Array.isArray(zones)) {
          for (const z of zones as PrintZone[]) {
            if (!zonesMap[z.product_id]) zonesMap[z.product_id] = {};
            if (z.side === "front") zonesMap[z.product_id].front = z;
            else if (z.side === "back") zonesMap[z.product_id].back = z;
          }
        }
        setPrintZonesMap(zonesMap);
        const chartIds = [...new Set(prodList.map((p) => p.size_chart_id).filter(Boolean))] as string[];
        if (chartIds.length > 0) {
          Promise.all(chartIds.map((id) =>
            fetch(`/api/size-charts/${id}`).then((r) => r.ok ? r.json() : null).catch(() => null)
          )).then((charts) => {
            const map: Record<string, SizeChart | null> = {};
            chartIds.forEach((id, i) => { map[id] = charts[i]; });
            setSizeChartsMap(map);
          });
        }
      })
      .catch(() => toast.error("Помилка завантаження даних"))
      .finally(() => setLoading(false));
  }, []);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const totalCents = cart.reduce(
    (sum, item) => sum + (item.unitPriceCents + item.printCostCents) * item.quantity, 0
  );

  // Customizer
  const [customizerProduct, setCustomizerProduct] = useState<ProductWithConfig | null>(null);
  const [customizerVariant, setCustomizerVariant] = useState<ProductColorVariant | null>(null);
  const [customizerSize, setCustomizerSize] = useState<string | undefined>(undefined);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  const openCustomizer = useCallback(
    (product: ProductWithConfig, variant: ProductColorVariant | null, size?: string | null) => {
      setCustomizerProduct(product); setCustomizerVariant(variant);
      setCustomizerSize(size ?? undefined); setEditingCartIndex(null);
    }, []
  );

  const handleEditCartItem = useCallback((index: number) => {
    const item = cart[index];
    if (!item) return;
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) return;
    const itemVariant = variants.filter((v) => v.product_id === item.productId)
      .find((v) => materials.find((m) => m.id === v.material_id)?.name === item.color) ?? null;
    setCustomizerProduct(prod); setCustomizerVariant(itemVariant);
    setCustomizerSize(item.size || undefined); setEditingCartIndex(index);
  }, [cart, products, variants, materials]);

  const handleAddToCart = useCallback((item: CartItem) => {
    if (editingCartIndex !== null) {
      setCart((prev) => prev.map((c, i) => (i === editingCartIndex ? item : c)));
    } else {
      setCart((prev) => [...prev, item]);
    }
    setCustomizerProduct(null); setEditingCartIndex(null);
    toast.success("Додано до замовлення");
  }, [editingCartIndex]);

  const handleAddWithoutPrint = useCallback(
    (product: ProductWithConfig, variant: ProductColorVariant | null, size?: string | null) => {
      const mat = variant ? materials.find((m) => m.id === variant.material_id) : null;
      const imgs = (() => {
        const productImgs = resolveProductImages(product.product_images, product.images);
        const variantImgs = variant ? resolveProductImages(variant.variant_images, variant.images) : null;
        return getCustomizableImages(variantImgs?.length ? variantImgs : productImgs);
      })();
      const imgUrl = imgs.front ?? Object.values(imgs)[0] ?? "";
      const resolvedSize = size ?? (Array.isArray(product.available_sizes) && product.available_sizes.length > 0
        ? product.available_sizes[Math.floor(product.available_sizes.length / 2)] : "");
      const discountPct = getDiscount(1);
      setCart((prev) => [...prev, {
        productId: product.id, productName: product.name, productImage: imgUrl,
        productPrice: product.base_price_cents / 100,
        unitPriceCents: product.base_price_cents * (1 - discountPct / 100),
        printCostCents: 0, quantity: 1, size: resolvedSize as string,
        color: mat?.name ?? "", layers: [],
      }]);
      toast.success("Додано до замовлення");
    }, [materials]
  );

  // Checkout
  const [step, setStep] = useState<"catalog" | "checkout" | "review">("catalog");
  const [orderTags, setOrderTags] = useState<string[]>([]);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [contact, setContact] = useState<ContactData>({
    name: "", email: "", phone: "", company: "", edrpou: "",
    socialNetwork: "Instagram", socialHandle: "",
    delivery: "nova_poshta", novaPoshtaDetails: "", deadline: "", comment: "",
  });

  const handleSubmitOrder = async () => {
    if (!contact.name.trim()) { toast.error("Введіть ім'я клієнта"); return; }
    if (!contact.phone.trim() && !contact.email.trim() && !contact.socialHandle.trim()) {
      toast.error("Введіть хоча б один контакт"); return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const uploadedExtraUrls: string[] = [];
      for (const file of extraFiles) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `order-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("uploads").upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(path);
          if (urlData?.publicUrl) uploadedExtraUrls.push(urlData.publicUrl);
        }
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "new",
          customer_data: {
            name: contact.name, phone: contact.phone || undefined, email: contact.email || undefined,
            social_channel: contact.socialHandle ? `${contact.socialNetwork}: ${contact.socialHandle}` : undefined,
            company: contact.company || undefined, edrpou: contact.edrpou || undefined,
            delivery: contact.delivery, nova_poshta_details: contact.novaPoshtaDetails || undefined,
            deadline: contact.deadline || undefined, comment: contact.comment || undefined,
            extra_files: uploadedExtraUrls.length > 0 ? uploadedExtraUrls : undefined,
          },
          total_amount_cents: totalCents,
          order_items: cart.map((item) => ({
            product_id: item.productId, size: item.size, color: item.color, quantity: item.quantity,
            custom_print_url: item.layers?.[0]?.uploadedUrl ?? undefined,
            mockup_url: item.mockupUploadedUrl ?? undefined,
            technical_metadata: {
              offset_top_mm: item.offsetTopMm ?? 0, layers: item.layers ?? [],
              mockups_map: item.mockupsMap ?? {}, item_note: item.itemNote ?? "",
              unit_price_cents: item.unitPriceCents, print_cost_cents: item.printCostCents,
            },
          })),
          tags: orderTags,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error ?? "Помилка збереження"); }
      toast.success("Замовлення створено!");
      router.push("/orders");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Помилка"); }
    finally { setSubmitting(false); }
  };

  const handleDownloadInvoice = async () => {
    setGeneratingPdf(true);
    try {
      await generateInvoicePDF({
        items: cart.map((item) => ({
          productName: item.productName, productImage: item.productImage,
          size: item.size, color: item.color, quantity: item.quantity,
          unitPriceCents: item.unitPriceCents + item.printCostCents,
        })),
        contact: { name: contact.name, email: contact.email, phone: contact.phone, company: contact.company || undefined },
        createdAt: new Date(),
      });
    } catch { toast.error("Помилка генерації PDF"); }
    finally { setGeneratingPdf(false); }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <StepHeader step={step} cartLength={cart.length} onNavigate={setStep} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-muted/10">
      {customizerProduct && (
        <Customizer
          product={customizerProduct}
          printZones={printZonesMap[customizerProduct.id] ?? {}}
          sizeChart={customizerProduct.size_chart_id ? (sizeChartsMap[customizerProduct.size_chart_id] ?? null) : null}
          materials={materials} variants={variants.filter((v) => v.product_id === customizerProduct.id)}
          initialVariant={customizerVariant} initialSize={customizerSize}
          initialLayers={editingCartIndex !== null ? (cart[editingCartIndex]?.layers ?? []) : []}
          initialQuantity={editingCartIndex !== null ? cart[editingCartIndex]?.quantity : undefined}
          initialNote={editingCartIndex !== null ? cart[editingCartIndex]?.itemNote : undefined}
          onAdd={handleAddToCart}
          onClose={() => { setCustomizerProduct(null); setEditingCartIndex(null); }}
        />
      )}

      {/* Sticky step header */}
      <StepHeader step={step} cartLength={cart.length} onNavigate={setStep} />

      {/* Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto selection:bg-primary/10 ${step === "catalog" ? "lg:pr-80" : ""}`}>
          <div className="mx-auto px-4 md:px-6 py-6 md:py-8 space-y-10 max-w-7xl">

            {step === "catalog" && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1.5">
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Виберіть товари</h2>
                    <p className="text-sm font-medium text-muted-foreground/80">Оберіть основу для замовлення та налаштуйте принт</p>
                  </div>
                  
                  <ProductQuickSearch 
                    products={products} 
                    onSelect={(p) => openCustomizer(p as ProductWithConfig, null)} 
                  />
                </div>

                <div className="space-y-6">
                  {categories.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                      <button 
                        onClick={() => setActiveCategory(null)}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                          activeCategory === null 
                            ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                            : "bg-background text-muted-foreground border-border/40 hover:border-primary/20 hover:text-foreground"
                        }`}
                      >
                        Всі товари
                      </button>
                      {categories.map((cat) => (
                        <button 
                          key={cat.id} 
                          onClick={() => setActiveCategory(cat.id)}
                          className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            activeCategory === cat.id 
                              ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                              : "bg-background text-muted-foreground border-border/40 hover:border-primary/20 hover:text-foreground"
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {products
                      .filter((p) => !activeCategory || (p as ProductWithConfig & { category_id?: string }).category_id === activeCategory)
                      .map((product) => (
                        <ProductCardInline 
                          key={product.id} 
                          product={product}
                          variants={variants.filter((v) => v.product_id === product.id)}
                          materials={materials}
                          onOpen={(variant: ProductColorVariant | null, size?: string | null) => openCustomizer(product, variant, size)}
                          onAddWithoutPrint={(variant: ProductColorVariant | null, size?: string | null) => handleAddWithoutPrint(product, variant, size)} 
                        />
                      ))}
                  </div>
                </div>
              </div>
            )}

            {step === "checkout" && (
              <div className="max-w-3xl mx-auto pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CheckoutForm contact={contact} setContact={setContact}
                  orderTags={orderTags} setOrderTags={setOrderTags}
                  extraFiles={extraFiles} setExtraFiles={setExtraFiles}
                  cart={cart} totalCents={totalCents}
                  onBack={() => setStep("catalog")}
                  onReview={() => setStep("review")} />
              </div>
            )}

            {step === "review" && (
              <div className="max-w-4xl mx-auto pb-28 animate-in fade-in zoom-in-95 duration-500">
                <ReviewStep cart={cart} totalCents={totalCents} contact={contact}
                  orderTags={orderTags} extraFiles={extraFiles}
                  generatingPdf={generatingPdf} submitting={submitting}
                  onBack={() => setStep("checkout")}
                  onSubmit={() => void handleSubmitOrder()}
                  onDownloadInvoice={handleDownloadInvoice} />
              </div>
            )}
          </div>
        </div>

        {/* Desktop cart side panel */}
        <DesktopCartPanel cart={cart} totalCents={totalCents} products={products}
          variants={variants} materials={materials} onEdit={handleEditCartItem}
          onRemove={(i: number) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
          onCheckout={() => setStep("checkout")}
          collapsible={step === "catalog"}
          hidden={step !== "catalog"} />
      </div>

      {/* Mobile cart bar */}
      {step === "catalog" && (
        <MobileAdminCart cart={cart} totalCents={totalCents} onEdit={handleEditCartItem}
          onRemove={(i: number) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
          onCheckout={() => setStep("checkout")} />
      )}
    </div>
  );
}

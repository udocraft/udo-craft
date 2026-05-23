"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product, PrintZone, Material, ProductColorVariant } from "@udo-craft/shared";
import type { PrintLayer } from "@udo-craft/shared";
import { track } from "@/lib/analytics";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Customizer, type CartItem } from "./_components/Customizer";
import { CartSummary, type ContactData } from "./_components/CartSummary";
import { SuccessModal } from "./_components/SuccessModal";
import { MobileCartBar } from "./_components/MobileCartBar";
import { DesktopCartPanel } from "./_components/DesktopCartPanel";
import { ProductGrid } from "./_components/ProductGrid";
import { StepHeader } from "./_components/StepHeader";
import { useCipherText } from "./_components/useCipherText";
import { LogoLoader } from "@udo-craft/ui";
import { createClient } from "@/lib/supabase/client";
import { useAiQuota } from "@/hooks/useAiQuota";
import type { LoadedCustomizerShare } from "./_lib/customizerShare";

// ── Types ─────────────────────────────────────────────────────────────────

interface ProductWithConfig extends Product {
  size_chart_id?: string | null;
  print_area_ids?: string[];
}

interface SizeChart { id: string; name: string; rows: Record<string, string>[]; }

const SESSION_KEY = "client-order-draft";

export interface OrderPageInnerProps {
  products: ProductWithConfig[];
  sizeCharts: Record<string, SizeChart>;
  printZones: Record<string, { front?: PrintZone | null; back?: PrintZone | null }>;
  materials: Material[];
  variants: ProductColorVariant[];
  categories: { id: string; name: string }[];
  loading: boolean;
}

export function OrderPageInner({
  products,
  sizeCharts,
  printZones,
  materials,
  variants,
  categories,
  loading,
}: OrderPageInnerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const aiQuota = useAiQuota(isAuthenticated);

  const checkAuth = useCallback(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setIsAuthenticated(!!data.user);
    });
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "contact" | "review">("select");
  const [highlightRequired, setHighlightRequired] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customizing, setCustomizing] = useState<ProductWithConfig | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [customizerInitialSize, setCustomizerInitialSize] = useState<string | null>(null);
  const [customizerInitialColor, setCustomizerInitialColor] = useState<string | null>(null);
  const [activeShare, setActiveShare] = useState<LoadedCustomizerShare | null>(null);
  const [contact, setContact] = useState<ContactData>({ name: "", email: "", phone: "", company: "", edrpou: "", socialNetwork: "telegram", socialHandle: "", delivery: "nova_poshta", novaPoshtaDetails: "", deadline: "", comment: "" });
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const processedAddQueryRef = useRef(false);
  const didRestoreRef = useRef(false);

  const buildPlainCartItem = useCallback((product: ProductWithConfig, variant: ProductColorVariant | null, size: string | null, color: string | null): CartItem => {
    const resolvedSize = size ?? ((Array.isArray(product.available_sizes) && product.available_sizes.length > 0 ? product.available_sizes[0] : "") as string);
    const resolvedColor = color ?? (variant ? materials.find((m) => m.id === variant.material_id)?.name ?? "Стандарт" : "Стандарт");
    const variantImages = variant?.images && Object.keys(variant.images).length > 0 ? variant.images : null;
    const productImage = variantImages?.front ?? (variantImages ? Object.values(variantImages)[0] : null) ?? product.images?.front ?? Object.values(product.images ?? {})[0] ?? "";
    return { productId: product.id, productName: product.name, productImage, productPrice: product.base_price_cents, unitPriceCents: product.base_price_cents, printCostCents: 0, quantity: 1, size: resolvedSize, color: resolvedColor, layers: [] };
  }, [materials]);

  // Session persistence — restore
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.step) setStep(draft.step);
      if (draft.contact) setContact(draft.contact);
      if (Array.isArray(draft.cart) && draft.cart.length > 0) {
        setCart(draft.cart.map((item: CartItem) => ({
          ...item,
          layers: (item.layers ?? []).map((l: PrintLayer) => ({ ...l, url: l.uploadedUrl ?? l.url ?? "", file: new File([], "restored") })),
        })));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session persistence — save
  useEffect(() => {
    if (!didRestoreRef.current) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        step, contact,
        cart: cart.map((item) => ({
          ...item,
          layers: (item.layers ?? []).map((l) => ({ ...l, file: undefined, url: l.uploadedUrl ?? "" })),
          mockupDataUrl: undefined, mockupBackDataUrl: undefined, mockupsMap: undefined,
        })),
      }));
      window.dispatchEvent(new Event("udo_cart_update"));
    } catch { /* quota */ }
  }, [step, cart, contact]);

  const cipherText = useCipherText(step === "contact");

  useEffect(() => {
    if (step !== "contact") return;
    setHighlightRequired(true);
    const t = setTimeout(() => setHighlightRequired(false), 1000);
    return () => clearTimeout(t);
  }, [step]);

  // Handle URL query params (product pre-selection, edit mode)
  useEffect(() => {
    if (loading || products.length === 0) return;
    const shareToken = searchParams.get("share");
    if (shareToken) {
      fetch(`/api/customizer-shares/${encodeURIComponent(shareToken)}`)
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error ?? "Не вдалося відкрити посилання");
          return r.json() as Promise<LoadedCustomizerShare>;
        })
        .then((share) => {
          const p = products.find((x) => x.id === share.productId);
          if (!p) {
            toast.error("Товар із посилання більше недоступний");
            return;
          }
          setActiveShare(share);
          setCustomizerInitialSize(share.payload.selectedSize);
          setCustomizerInitialColor(share.payload.selectedColor);
          setCustomizing(p);
        })
        .catch((err) => toast.error(err instanceof Error ? err.message : "Не вдалося відкрити посилання"));
      return;
    }
    const pid = searchParams.get("product");
    const editIdx = searchParams.get("edit");

    if (editIdx !== null && !isNaN(Number(editIdx))) {
      const idx = Number(editIdx);
      const storedCart = sessionStorage.getItem("udo_cart");
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart) as CartItem[];
          if (parsedCart[idx]) {
            setCart(parsedCart);
            setEditingCartIndex(idx);
            const item = parsedCart[idx];
            const prod = products.find((x) => x.id === item.productId);
            if (prod) { setCustomizing(prod); setCustomizerInitialSize(item.size); setCustomizerInitialColor(item.color); }
            return;
          }
        } catch { /* ignore */ }
      }
    }

    if (pid) {
      const p = products.find((x) => x.id === pid || x.slug === pid);
      if (p) {
        setActiveCategory(((p as ProductWithConfig & { category_id?: string | null }).category_id) ?? null);
        const variantId = searchParams.get("variant");
        const color = searchParams.get("color");
        const selectedVariant = variantId
          ? variants.find((v) => v.id === variantId) ?? null
          : color
            ? variants.find((v) => { const materialName = materials.find((m) => m.id === v.material_id)?.name; return v.product_id === p.id && materialName === color; }) ?? (variants.find((v) => v.product_id === p.id) ?? null)
            : (variants.find((v) => v.product_id === p.id) ?? null);
        if (searchParams.get("add") === "1" && !processedAddQueryRef.current) {
          processedAddQueryRef.current = true;
          setCart((prev) => [...prev, buildPlainCartItem(p, selectedVariant, searchParams.get("size"), color)]);
          toast.success(`${p.name} додано до кошика`);
          router.replace("/order");
          return;
        }
        setCustomizerInitialSize(searchParams.get("size"));
        setCustomizerInitialColor(searchParams.get("color"));
        setCustomizing(p);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products]);

  const handleAddItem = useCallback((item: CartItem) => {
    setCart((prev) => {
      if (editingCartIndex !== null) { const next = [...prev]; next[editingCartIndex] = item; return next; }
      return [...prev, item];
    });
    setEditingCartIndex(null);
    setCustomizerInitialSize(null);
    setCustomizerInitialColor(null);
    setCustomizing(null);
    track("customize_complete", { product_id: item.productId, quantity: item.quantity });
  }, [editingCartIndex]);

  const totalCents = cart.reduce((sum, item) => sum + (item.unitPriceCents + item.printCostCents) * item.quantity, 0);
  const stepIdx = (["select", "contact", "review"] as const).indexOf(step);

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <>
      {customizing && (
        <Customizer
          product={customizing}
          printZones={printZones[customizing.id] ?? {}}
          sizeChart={customizing.size_chart_id ? sizeCharts[customizing.size_chart_id] : null}
          materials={materials}
          variants={variants.filter((v) => v.product_id === customizing.id)}
          onAdd={handleAddItem}
          onClose={() => { setCustomizing(null); setEditingCartIndex(null); setCustomizerInitialSize(null); setCustomizerInitialColor(null); setActiveShare(null); }}
          initialSize={editingCartIndex !== null ? cart[editingCartIndex]?.size : (customizerInitialSize ?? searchParams.get("size") ?? undefined)}
          initialColor={editingCartIndex !== null ? cart[editingCartIndex]?.color : (customizerInitialColor ?? searchParams.get("color") ?? undefined)}
          initialLayers={editingCartIndex !== null ? cart[editingCartIndex]?.layers : undefined}
          existingMockupUploadedUrl={editingCartIndex !== null ? cart[editingCartIndex]?.mockupUploadedUrl : undefined}
          initialShare={activeShare ?? undefined}
          isAuthenticated={isAuthenticated}
          aiQuota={aiQuota}
          onAuthSuccess={() => setIsAuthenticated(true)}
        />
      )}

      {successEmail !== null && (
        <SuccessModal email={successEmail} onClose={() => router.push("/")} />
      )}

      <div className="flex flex-col flex-1 min-h-0">
        {/* Header with step indicator */}
        <StepHeader
          step={step}
          stepIdx={stepIdx}
          cartLength={cart.length}
          onNavigate={setStep}
        />

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <div className={`flex-1 overflow-y-auto ${step === "select" ? "" : "lg:pr-80"}`}>
            <div className="mx-auto px-4 py-6 space-y-6 max-w-full">
              {step === "select" && (
                <ProductGrid
                  products={products}
                  variants={variants}
                  materials={materials}
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  onCustomize={(prod, size, color) => {
                    setEditingCartIndex(null);
                    setActiveCategory(((prod as ProductWithConfig & { category_id?: string | null }).category_id) ?? null);
                    setCustomizerInitialSize(size);
                    setCustomizerInitialColor(color);
                    setCustomizing(prod);
                    track("customize_start", { product_id: prod.id });
                  }}
                  onAddWithoutPrint={(prod, size, color, variant) => {
                    setCart((prev) => [...prev, buildPlainCartItem(prod, variant, size, color)]);
                    toast.success(`${prod.name} додано до кошика`);
                  }}
                />
              )}

              {(step === "contact" || step === "review") && (
                <CartSummary
                  cart={cart}
                  contact={contact}
                  setContact={setContact}
                  step={step}
                  setStep={setStep}
                  highlightRequired={highlightRequired}
                  cipherText={cipherText}
                  showExtraDetails={showExtraDetails}
                  setShowExtraDetails={setShowExtraDetails}
                  onRemoveCartItem={(i) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
                  onEditCartItem={(i) => { const prod = products.find((p) => p.id === cart[i]?.productId); if (!prod) return; setCustomizerInitialSize(null); setCustomizerInitialColor(null); setEditingCartIndex(i); setCustomizing(prod); }}
                  onSubmitSuccess={(email) => setSuccessEmail(email)}
                  products={products}
                  extraFiles={extraFiles}
                  setExtraFiles={setExtraFiles}
                />
              )}
            </div>
          </div>

          {/* Desktop cart — collapsible on select step, hidden on contact/review */}
          <DesktopCartPanel
            cart={cart}
            totalCents={totalCents}
            onCheckout={() => setStep("contact")}
            onEdit={(i) => { const prod = products.find((p) => p.id === cart[i]?.productId); if (!prod) return; setCustomizerInitialSize(null); setCustomizerInitialColor(null); setEditingCartIndex(i); setCustomizing(prod); }}
            onRemove={(i) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
            collapsible={step === "select"}
            hidden={step === "contact" || step === "review"}
          />

          <MobileCartBar
            cart={cart}
            totalCents={totalCents}
            onCheckout={() => setStep("contact")}
            onRemove={(i) => setCart((prev) => prev.filter((_, idx) => idx !== i))}
            onEdit={(i) => { const prod = products.find((p) => p.id === cart[i]?.productId); if (!prod) return; setCustomizerInitialSize(null); setCustomizerInitialColor(null); setEditingCartIndex(i); setCustomizing(prod); }}
          />
        </div>
      </div>
    </>
  );
}

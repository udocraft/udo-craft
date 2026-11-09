"use client";

import React, { useRef, useState } from "react";
import { MockupViewer } from "@/components/MockupViewer";
import { Button } from "@/components/ui/button";
import { generateInvoicePDF } from "@/lib/generate-invoice";
import { getSessionId, getVisitorId, track } from "@/lib/analytics";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sound } from "@/lib/sound";
import type { PrintLayer } from "@udo-craft/shared";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ContactForm, checkoutErrors, type CheckoutField } from "./ContactForm";

const FIELDS: CheckoutField[] = ["name", "phone", "email", "delivery"];

// ── Types ─────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  unitPriceCents: number;
  printCostCents: number;
  quantity: number;
  size: string;
  color: string;
  itemNote?: string;
  layers?: PrintLayer[];
  mockupDataUrl?: string;
  mockupUploadedUrl?: string;
  mockupBackDataUrl?: string;
  mockupsMap?: Record<string, string>;
  offsetTopMm?: number;
}

export interface ContactData {
  name: string;
  email: string;
  phone: string;
  company: string;
  edrpou: string;
  socialNetwork: string;
  socialHandle: string;
  delivery: string;
  novaPoshtaDetails: string;
  /** "card" (payment link after confirmation) or "invoice" (bank transfer). Nothing is charged on the site. */
  payment: string;
  source: string;
  sourceDetails: string;
  deadline: string;
  comment: string;
}

const SESSION_KEY = "client-order-draft";

export interface CartSummaryProps {
  cart: CartItem[];
  contact: ContactData;
  setContact: (c: ContactData) => void;
  setStep: (s: "select" | "contact") => void;
  onEditCartItem: (i: number) => void;
  onSubmitSuccess: (email: string) => void;
  extraFiles: File[];
  setExtraFiles: (files: File[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function CartSummary({ cart, contact, setContact, setStep, onEditCartItem, onSubmitSuccess, extraFiles, setExtraFiles }: CartSummaryProps) {
  const t = useTranslations("checkout");
  const tErr = useTranslations("checkoutErrors");
  const tCart = useTranslations("cart");
  const tCab = useTranslations("cabinet");
  const tCol = useTranslations("collections");
  const formRef = useRef<HTMLDivElement>(null);
  const [touched, setTouched] = useState<Partial<Record<CheckoutField, boolean>>>({});
  const errors = checkoutErrors(contact, { required: tErr("required"), phone: tErr("phone"), email: tErr("email"), branch: t("np.required") });
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const totalCents = cart.reduce(
    (sum, item) => sum + (item.unitPriceCents + item.printCostCents) * item.quantity,
    0
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    sound.button();
    try {
      let attachmentUrls: string[] = [];
      if (extraFiles.length > 0) {
        const fd = new FormData();
        extraFiles.forEach((f) => fd.append("files", f));
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) attachmentUrls = (await res.json()).urls ?? [];
      }

      const orderItems = cart.map((item) => {
        const layerUrls: { url: string; type: string; side: string; kind?: string; textContent?: string; sizeLabel?: string; sizeMinCm?: number; sizeMaxCm?: number; priceCents?: number }[] = [];
        for (const layer of (item.layers ?? [])) {
          if (layer.kind === "text") {
            layerUrls.push({ url: "", type: layer.type, side: layer.side, kind: "text", textContent: layer.textContent, sizeLabel: layer.sizeLabel, sizeMinCm: layer.sizeMinCm, sizeMaxCm: layer.sizeMaxCm, priceCents: layer.priceCents });
            continue;
          }
          const url = layer.uploadedUrl;
          if (!url) continue;
          layerUrls.push({ url, type: layer.type, side: layer.side, sizeLabel: layer.sizeLabel, sizeMinCm: layer.sizeMinCm, sizeMaxCm: layer.sizeMaxCm, priceCents: layer.priceCents });
        }
        return {
          product_id: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          mockup_url: item.mockupUploadedUrl,
          custom_print_url: layerUrls[0]?.url,
          unit_price_cents: item.unitPriceCents,
          print_cost_cents: item.printCostCents,
          technical_metadata: {
            unit_price_cents: item.unitPriceCents,
            print_cost_cents: item.printCostCents,
            ...(item.offsetTopMm !== undefined ? { offset_top_mm: item.offsetTopMm } : {}),
            layers: layerUrls,
            product_image_url: item.productImage || undefined,
            product_name: item.productName,
            ...(item.itemNote ? { item_note: item.itemNote } : {}),
          },
        };
      });

      const leadRes = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "new",
          customer_data: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            company: contact.company || undefined,
            edrpou: contact.edrpou || undefined,
            social_channel: contact.socialHandle ? `${contact.socialNetwork}:${contact.socialHandle}` : undefined,
            delivery: contact.delivery,
            delivery_details: contact.novaPoshtaDetails || undefined,
            payment: contact.payment,
            source: contact.source || undefined,
            source_details: contact.sourceDetails || undefined,
            deadline: contact.deadline || undefined,
            comment: contact.comment || undefined,
            attachments: attachmentUrls,
          },
          total_amount_cents: Math.round(totalCents),
          order_items: orderItems,
          visitor_id: getVisitorId(),
          session_id: getSessionId(),
          initial_message: [
            contact.comment ? `Коментар: ${contact.comment}` : null,
            contact.source ? `Як дізнались: ${contact.source}${contact.sourceDetails ? ` — ${contact.sourceDetails}` : ""}` : null,
          ].filter(Boolean).join("\n"),
        }),
      });

      if (!leadRes.ok) throw new Error((await leadRes.json().catch(() => ({}))).error || "Order request failed");
      const lead = await leadRes.json();

      track("form_submit", { form: "order", lead_id: lead.id });
      sessionStorage.removeItem(SESSION_KEY);
      sound.celebration();
      onSubmitSuccess(contact.email);
    } catch (err) {
      console.error("[handleSubmit]", err);
      toast.error(t("submitError"));
      sound.caution();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    setGeneratingPdf(true);
    try {
      await generateInvoicePDF({
        items: cart.map((item) => ({
          productName: item.productName,
          productImage: item.productImage,
          size: item.size, color: item.color, quantity: item.quantity,
          unitPriceCents: item.productPrice,
          printCostCents: item.printCostCents,
          printUrl: item.mockupDataUrl,
          layers: item.layers?.map((l) => ({
            type: l.type, sizeLabel: l.sizeLabel, sizeMinCm: l.sizeMinCm,
            sizeMaxCm: l.sizeMaxCm, priceCents: l.priceCents, kind: l.kind, textContent: l.textContent,
          })),
        })),
        contact: { name: contact.name, email: contact.email, phone: contact.phone, company: contact.company || undefined },
        createdAt: new Date(),
      });
    } catch { toast.error(t("submitError")); }
    finally { setGeneratingPdf(false); }
  };

  const shown = (key: CheckoutField) => (touched[key] ? errors[key] : null);

  const confirm = () => {
    const firstInvalid = FIELDS.find((k) => errors[k]);
    if (firstInvalid) {
      setTouched({ name: true, phone: true, email: true, delivery: true });
      const target = firstInvalid === "delivery"
        ? formRef.current?.querySelector<HTMLElement>('input[name="delivery"]:checked')
        : formRef.current?.querySelector<HTMLElement>(`#order-${firstInvalid}`);
      target?.focus();
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
      sound.caution();
      return;
    }
    void handleSubmit();
  };

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <p className="text-h4 font-semibold">{t("emptyCart")}</p>
        <Button onClick={() => setStep("select")}>{t("toCatalog")}</Button>
      </div>
    );
  }

  const productsCents = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const printCents = cart.reduce((sum, item) => sum + item.printCostCents * item.quantity, 0);
  const money = (cents: number) => `${(cents / 100).toFixed(0)} ₴`;
  const confirmLabel = submitting ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("submitting")}</> : t("submit");

  return (
    <div className="mx-auto grid max-w-5xl gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-0">
      <div ref={formRef}>
        <h1 className="mb-4 text-h3 font-semibold">{t("placeOrder")}</h1>
        <ContactForm
          contact={contact}
          setContact={setContact}
          errors={{ name: shown("name"), phone: shown("phone"), email: shown("email"), delivery: shown("delivery") }}
          onBlur={(key) => setTouched((prev) => ({ ...prev, [key]: true }))}
          extraFiles={extraFiles}
          setExtraFiles={setExtraFiles}
        />
      </div>

      <aside aria-labelledby="order-summary-title" className="self-start rounded-card border border-border bg-card p-5 lg:sticky lg:top-20">
        <h2 id="order-summary-title" className="text-h4 font-semibold">{t("summaryTitle")}</h2>
        <ul className="mt-4 divide-y divide-border">
          {cart.map((item, i) => (
            <li key={i} className="flex gap-3 py-3 first:pt-0">
              <div className="size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background">
                <MockupViewer images={item.mockupsMap} frontUrl={item.mockupDataUrl ?? item.mockupUploadedUrl} backUrl={item.mockupBackDataUrl} fallbackUrl={item.productImage} alt={item.productName} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.productName}</p>
                <p className="text-sm text-muted-foreground">{tCart("quantity", { qty: item.quantity, size: item.size })} · {item.color}</p>
                <button type="button" onClick={() => onEditCartItem(i)} className="hit-44 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {t("edit")}
                </button>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{(item.unitPriceCents + item.printCostCents) > 0 ? money((item.unitPriceCents + item.printCostCents) * item.quantity) : tCol("priceOnRequest")}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-2 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{money(productsCents)}</dd></div>
          {printCents > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("printCost")}</dt><dd className="tabular-nums">{money(printCents)}</dd></div>}
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("deliveryTitle")}</dt><dd>{contact.delivery === "pickup" ? t("free") : t("byCarrier")}</dd></div>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">{t("total")}</dt>
            <dd className="text-h3 font-semibold tabular-nums">{money(totalCents)}</dd>
          </div>
        </dl>

        <Button size="lg" className="mt-4 hidden w-full lg:inline-flex" onClick={confirm} disabled={submitting}>{confirmLabel}</Button>
        <button type="button" onClick={handleDownloadInvoice} disabled={generatingPdf}
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-control text-sm font-medium text-primary hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {generatingPdf ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileDown className="size-4" aria-hidden="true" />}
          {tCab("details.invoice")}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">
          {t.rich("agree", {
            privacy: (chunks) => <Link href="/privacy" className="underline underline-offset-2">{chunks}</Link>,
            terms: (chunks) => <Link href="/terms" className="underline underline-offset-2">{chunks}</Link>,
          })}
        </p>
      </aside>

      {/* Mobile: total and the one primary action stay in reach. */}
      <div data-sticky-bar className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="shrink-0 whitespace-nowrap">
          <p className="text-xs text-muted-foreground">{t("total")}</p>
          <p className="text-lg font-semibold tabular-nums">{money(totalCents)}</p>
        </div>
        <Button size="lg" className="flex-1" onClick={confirm} disabled={submitting}>{confirmLabel}</Button>
      </div>
    </div>
  );
}

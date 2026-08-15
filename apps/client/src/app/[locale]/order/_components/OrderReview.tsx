"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { MockupViewer } from "@/components/MockupViewer";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import type { CartItem } from "./Customizer";
import type { ContactData } from "./CartSummary";

interface OrderReviewProps {
  cart: CartItem[];
  contact: ContactData;
  extraFiles: File[];
  submitting: boolean;
  generatingPdf: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onDownloadInvoice: () => void;
}

export function OrderReview({
  cart, contact, extraFiles, submitting, generatingPdf,
  onBack, onSubmit, onDownloadInvoice,
}: OrderReviewProps) {
  const t = useTranslations("checkout");
  const tCab = useTranslations("cabinet");
  const totalCents = cart.reduce((sum, item) => sum + (item.unitPriceCents + item.printCostCents) * item.quantity, 0);

  const deliveryLabels: Record<string, string> = {
    nova_poshta: t("delivery.options.nova_poshta.label"),
    pickup: t("delivery.options.pickup.label"),
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("stepReview")}</h2>
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div>
          <h3 className="font-bold mb-3">{t("stepCart")} ({cart.length})</h3>
          <div className="space-y-2">
            {cart.map((item, i) => {
              const lineTotal = (item.unitPriceCents + item.printCostCents) * item.quantity / 100;
              return (
                <div key={i} className="bg-muted/30 rounded-xl overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-card border border-border/40">
                      <MockupViewer
                        images={item.mockupsMap}
                        frontUrl={item.mockupDataUrl ?? item.mockupUploadedUrl}
                        backUrl={item.mockupBackDataUrl}
                        fallbackUrl={item.productImage}
                        alt={item.productName}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} pcs · {item.size} · {item.color}</p>
                      {item.itemNote && <p className="text-[10px] text-muted-foreground italic mt-0.5">&quot;{item.itemNote}&quot;</p>}
                    </div>
                    <p className="text-sm font-bold shrink-0">{lineTotal.toFixed(0)} ₴</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-muted/30 border border-dashed border-border/80 space-y-2 relative overflow-hidden shadow-inner">
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{t("total")}:</span>
              <span>{(cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0) / 100).toFixed(0)} ₴</span>
            </div>
            {cart.some(item => item.printCostCents > 0) && (
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>{tCab("details.print")}:</span>
                <span>{(cart.reduce((sum, item) => sum + item.printCostCents * item.quantity, 0) / 100).toFixed(0)} ₴</span>
              </div>
            )}
            <div className="border-t border-dotted border-border/80 pt-2.5 flex justify-between items-baseline text-base font-black">
              <span className="uppercase tracking-wider text-xs text-foreground">{t("total")}</span>
              <div className="font-mono text-primary flex items-baseline gap-1 text-xl">
                <AnimatedNumber value={totalCents / 100} decimals={0} className="font-black" />
                <span className="text-sm font-bold">₴</span>
              </div>
            </div>
          </div>
          <div className="pt-4">
            <button onClick={onDownloadInvoice} disabled={generatingPdf}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-primary text-primary font-semibold rounded-full hover:bg-primary/5 transition-colors text-sm disabled:opacity-50">
              <FileDown className="w-4 h-4" />
              {generatingPdf ? tCab("details.positions", { n: "" }) : tCab("details.invoice")}
            </button>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <h3 className="font-bold">{t("contact.title")}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              { label: t("contact.fullName"), value: contact.name },
              { label: t("contact.phone"), value: contact.phone },
              { label: t("contact.email"), value: contact.email },
              { label: t("company.title"), value: contact.company || "—" },
              { label: t("company.taxId"), value: contact.edrpou || "—" },
              { label: t("contact.social"), value: contact.socialHandle ? `${contact.socialNetwork}: ${contact.socialHandle}` : "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
                <p className="font-medium text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{t("delivery.title")}</h4>
            <p className="text-sm font-medium">{deliveryLabels[contact.delivery] ?? "—"}</p>
            {contact.novaPoshtaDetails && <p className="text-sm text-muted-foreground">{contact.novaPoshtaDetails}</p>}
          </div>
          {(contact.deadline || contact.comment) && (
            <div className="border-t border-border pt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {contact.deadline && (
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{t("delivery.deadline")}</p>
                  <p className="font-medium mt-0.5">{new Date(contact.deadline).toLocaleDateString()}</p>
                </div>
              )}
              {contact.comment && (
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{t("delivery.comment")}</p>
                  <p className="text-sm mt-0.5">{contact.comment}</p>
                </div>
              )}
            </div>
          )}
          {extraFiles.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">{tCab("details.attachments", { n: extraFiles.length })}</p>
              <div className="space-y-1">
                {extraFiles.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">📎 {f.name}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-6 bg-background/95 border-t border-border px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex gap-2 backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={onBack}>{t("edit")}</Button>
        <Button className="flex-1 gap-1.5" onClick={onSubmit} disabled={submitting}>
          {submitting ? <><Loader2 className="size-3.5 animate-spin" /> {t("submitting")}</> : t("submit")}
        </Button>
      </div>
    </div>
  );
}

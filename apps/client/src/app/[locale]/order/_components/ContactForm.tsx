"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, X, Upload } from "lucide-react";
import type { ContactData } from "./CartSummary";

interface ContactFormProps {
  contact: ContactData;
  setContact: (c: ContactData) => void;
  highlightRequired: boolean;
  cipherText: string;
  showExtraDetails: boolean;
  setShowExtraDetails: (v: boolean) => void;
  extraFiles: File[];
  setExtraFiles: (files: File[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ContactForm({
  contact, setContact, highlightRequired, cipherText,
  showExtraDetails, setShowExtraDetails, extraFiles, setExtraFiles,
  onBack, onNext,
}: ContactFormProps) {
  const t = useTranslations("checkout");
  const tForm = useTranslations("contactForm");

  const deliveryOptions = [
    { id: "nova_poshta", label: t("delivery.options.nova_poshta.label"), desc: t("delivery.options.nova_poshta.desc") },
    { id: "pickup", label: t("delivery.options.pickup.label"), desc: t("delivery.options.pickup.desc") },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("contact.title")}</h2>
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("contact.fullName")}</Label>
            <Input type="text" value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              placeholder={cipherText}
              className={`font-mono placeholder:font-mono ${!contact.name && highlightRequired ? "animate-shake" : ""}`} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("contact.phone")}</Label>
            <Input type="tel" value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              placeholder={t("contact.phonePlaceholder")}
              className={!contact.phone && highlightRequired ? "animate-shake" : ""} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("contact.email")}</Label>
            <Input type="email" value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              placeholder={t("contact.emailPlaceholder")}
              className={!contact.email && highlightRequired ? "animate-shake" : ""} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("company.title")}</Label>
            <Input type="text" value={contact.company}
              onChange={(e) => setContact({ ...contact, company: e.target.value })}
              placeholder={t("company.namePlaceholder")} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("company.taxId")}</Label>
            <Input type="text" value={contact.edrpou}
              onChange={(e) => setContact({ ...contact, edrpou: e.target.value })}
              placeholder={t("company.taxIdPlaceholder")} />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{t("contact.social")}</Label>
            <div className="flex gap-2">
              <select value={contact.socialNetwork}
                onChange={(e) => setContact({ ...contact, socialNetwork: e.target.value })}
                className="h-9 shrink-0 rounded-md border border-input bg-background px-3 text-sm">
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="viber">Viber</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
              </select>
              <Input type="text" value={contact.socialHandle}
                onChange={(e) => setContact({ ...contact, socialHandle: e.target.value })}
                placeholder={t("contact.socialPlaceholder")} className="flex-1 min-w-0" />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">{t("delivery.title")}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deliveryOptions.map((opt) => (
              <button key={opt.id} type="button"
                onClick={() => setContact({ ...contact, delivery: opt.id })}
                className={`text-left p-3 rounded-xl border transition-colors ${contact.delivery === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {contact.delivery === "nova_poshta" && (
            <div className="mt-2 space-y-1">
              <Label className="text-xs font-medium">{t("delivery.options.nova_poshta.label")}</Label>
              <Input type="text" value={contact.novaPoshtaDetails}
                onChange={(e) => setContact({ ...contact, novaPoshtaDetails: e.target.value })}
                placeholder={t("delivery.options.nova_poshta.desc")} />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div>
            <Label className="text-sm font-medium mb-1.5 block">{tForm("topicLabel")}</Label>
            <Input type="text" value={contact.source}
              onChange={(e) => setContact({ ...contact, source: e.target.value })}
              placeholder={tForm("topicLabel")}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </div>

        <button type="button" onClick={() => setShowExtraDetails(!showExtraDetails)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
          <ChevronRight className={`size-4 transition-transform ${showExtraDetails ? "rotate-90" : ""}`} />
          {showExtraDetails ? t("edit") : t("company.title")}
        </button>

        {showExtraDetails && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{t("delivery.deadline")}</Label>
              <Input type="date" value={contact.deadline}
                onChange={(e) => setContact({ ...contact, deadline: e.target.value })}
                className="w-full sm:w-48" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{t("delivery.comment")}</Label>
              <textarea value={contact.comment}
                onChange={(e) => setContact({ ...contact, comment: e.target.value })}
                placeholder={t("delivery.commentPlaceholder")} rows={3}
                className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring bg-background" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">{tForm("filesLabel")}</Label>
              <input type="file" multiple id="extra-files" className="hidden"
                onChange={(e) => setExtraFiles(Array.from(e.target.files || []))} />
              <label htmlFor="extra-files"
                className="flex flex-col items-center justify-center w-full p-5 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <Upload className="size-5 text-muted-foreground mb-1.5" />
                <p className="text-sm text-muted-foreground font-medium">{tForm("filesClick")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tForm("filesDesc")}</p>
              </label>
              {extraFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {extraFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                      <span className="text-xs truncate">{f.name}</span>
                      <button type="button" onClick={() => setExtraFiles(extraFiles.filter((_, idx) => idx !== i))}>
                        <X className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="sticky bottom-0 z-10 -mx-6 bg-background/95 border-t border-border px-6 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex gap-2 backdrop-blur">
          <Button variant="outline" className="flex-1" onClick={onBack}>{t("back")}</Button>
          <Button className="flex-1" onClick={onNext}
            disabled={!contact.name.trim() || !contact.phone.trim() || !contact.email.trim()}>
            {t("stepReview")}
          </Button>
        </div>
      </div>
    </div>
  );
}

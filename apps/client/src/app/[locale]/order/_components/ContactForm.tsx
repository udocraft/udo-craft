"use client";

import React, { useRef, useState } from "react";
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
  const tErr = useTranslations("checkoutErrors");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLDivElement>(null);

  // Required: name, phone, email. Shown after the field is left or a next attempt.
  const digits = contact.phone.replace(/\D/g, "").length;
  const errors: Record<string, string | null> = {
    name: contact.name.trim() ? null : tErr("required"),
    phone: !contact.phone.trim() ? tErr("required") : digits < 9 ? tErr("phone") : null,
    email: !contact.email.trim() ? tErr("required") : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim()) ? null : tErr("email"),
  };
  const shown = (field: string) => (touched[field] || highlightRequired) && errors[field] ? errors[field] : null;
  const blur = (field: string) => setTouched((prev) => ({ ...prev, [field]: true }));
  const field = (id: string, key: string) => ({
    id,
    "aria-invalid": shown(key) ? true : undefined,
    "aria-describedby": shown(key) ? `${id}-error` : undefined,
    onBlur: () => blur(key),
  });
  const FieldError = ({ id, field: key }: { id: string; field: string }) =>
    shown(key) ? (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
        {shown(key)}
      </p>
    ) : null;

  const next = () => {
    const firstInvalid = (["name", "phone", "email"] as const).find((k) => errors[k]);
    if (firstInvalid) {
      setTouched({ name: true, phone: true, email: true });
      formRef.current?.querySelector<HTMLInputElement>(`#order-${firstInvalid}`)?.focus();
      return;
    }
    onNext();
  };

  const deliveryOptions = [
    { id: "nova_poshta", label: t("delivery.options.nova_poshta.label"), desc: t("delivery.options.nova_poshta.desc") },
    { id: "pickup", label: t("delivery.options.pickup.label"), desc: t("delivery.options.pickup.desc") },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-h3 font-semibold">{t("contact.title")}</h2>
      <div ref={formRef} className="bg-card rounded-card border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="order-name" className="text-sm font-medium mb-1.5 block">{t("contact.fullName")}</Label>
            <Input type="text" autoComplete="name" value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
              placeholder={cipherText}
              {...field("order-name", "name")}
              className={`font-mono placeholder:font-mono ${shown("name") && highlightRequired ? "animate-shake" : ""}`} />
            <FieldError id="order-name" field="name" />
          </div>
          <div>
            <Label htmlFor="order-phone" className="text-sm font-medium mb-1.5 block">{t("contact.phone")}</Label>
            <Input type="tel" autoComplete="tel" inputMode="tel" value={contact.phone}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              placeholder={t("contact.phonePlaceholder")}
              {...field("order-phone", "phone")}
              className={shown("phone") && highlightRequired ? "animate-shake" : ""} />
            <FieldError id="order-phone" field="phone" />
          </div>
          <div>
            <Label htmlFor="order-email" className="text-sm font-medium mb-1.5 block">{t("contact.email")}</Label>
            <Input type="email" autoComplete="email" value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
              placeholder={t("contact.emailPlaceholder")}
              {...field("order-email", "email")}
              className={shown("email") && highlightRequired ? "animate-shake" : ""} />
            <FieldError id="order-email" field="email" />
          </div>
          <div>
            <Label htmlFor="order-company" className="text-sm font-medium mb-1.5 block">{t("company.title")}</Label>
            <Input id="order-company" type="text" autoComplete="organization" value={contact.company}
              onChange={(e) => setContact({ ...contact, company: e.target.value })}
              placeholder={t("company.namePlaceholder")} />
          </div>
          <div>
            <Label htmlFor="order-taxid" className="text-sm font-medium mb-1.5 block">{t("company.taxId")}</Label>
            <Input id="order-taxid" type="text" inputMode="numeric" autoComplete="off" value={contact.edrpou}
              onChange={(e) => setContact({ ...contact, edrpou: e.target.value })}
              placeholder={t("company.taxIdPlaceholder")} />
          </div>
          <div>
            <Label htmlFor="order-social" className="text-sm font-medium mb-1.5 block">{t("contact.social")}</Label>
            <div className="flex gap-2">
              <select aria-label={t("contact.social")} value={contact.socialNetwork}
                onChange={(e) => setContact({ ...contact, socialNetwork: e.target.value })}
                className="h-11 shrink-0 rounded-md border border-input bg-background px-3 text-base sm:text-sm">
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="viber">Viber</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
              </select>
              <Input id="order-social" type="text" value={contact.socialHandle}
                onChange={(e) => setContact({ ...contact, socialHandle: e.target.value })}
                placeholder={t("contact.socialPlaceholder")} className="flex-1 min-w-0" />
            </div>
          </div>
        </div>

        <div>
          <p id="order-delivery-label" className="text-sm font-medium mb-2">{t("delivery.title")}</p>
          <div role="group" aria-labelledby="order-delivery-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {deliveryOptions.map((opt) => (
              <button key={opt.id} type="button" aria-pressed={contact.delivery === opt.id}
                onClick={() => setContact({ ...contact, delivery: opt.id })}
                className={`text-left p-3 min-h-11 rounded-card border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${contact.delivery === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {contact.delivery === "nova_poshta" && (
            <div className="mt-2 space-y-1">
              <Label htmlFor="order-np" className="text-sm font-medium">{t("delivery.options.nova_poshta.label")}</Label>
              <Input id="order-np" type="text" autoComplete="street-address" value={contact.novaPoshtaDetails}
                onChange={(e) => setContact({ ...contact, novaPoshtaDetails: e.target.value })}
                placeholder={t("delivery.options.nova_poshta.desc")} />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <div>
            <Label htmlFor="order-source" className="text-sm font-medium mb-1.5 block">{tForm("topicLabel")}</Label>
            <Input id="order-source" type="text" value={contact.source}
              onChange={(e) => setContact({ ...contact, source: e.target.value })}
              placeholder={tForm("topicLabel")}
              className="w-full" />
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
              <Label htmlFor="order-deadline" className="text-sm font-medium mb-1.5 block">{t("delivery.deadline")}</Label>
              <Input id="order-deadline" type="date" value={contact.deadline}
                onChange={(e) => setContact({ ...contact, deadline: e.target.value })}
                className="w-full sm:w-48" />
            </div>
            <div>
              <Label htmlFor="order-comment" className="text-sm font-medium mb-1.5 block">{t("delivery.comment")}</Label>
              <textarea id="order-comment" value={contact.comment}
                onChange={(e) => setContact({ ...contact, comment: e.target.value })}
                placeholder={t("delivery.commentPlaceholder")} rows={3}
                className="w-full px-3 py-2 border border-input rounded-md text-base sm:text-sm resize-none bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">{tForm("filesLabel")}</p>
              <input type="file" multiple id="extra-files" className="hidden"
                onChange={(e) => setExtraFiles(Array.from(e.target.files || []))} />
              <label htmlFor="extra-files"
                className="flex flex-col items-center justify-center w-full p-5 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <Upload className="size-5 text-muted-foreground mb-1.5" />
                <p className="text-sm text-muted-foreground font-medium">{tForm("filesClick")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tForm("filesDesc")}</p>
              </label>
              {extraFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {extraFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border border-border">
                      <span className="text-xs truncate">{f.name}</span>
                      <button type="button" aria-label={`${t("removeItem")}: ${f.name}`} className="flex size-11 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setExtraFiles(extraFiles.filter((_, idx) => idx !== i))}>
                        <X className="size-3.5 text-muted-foreground hover:text-destructive" aria-hidden="true" />
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
          <Button className="flex-1" onClick={next}>
            {t("stepReview")}
          </Button>
        </div>
      </div>
    </div>
  );
}

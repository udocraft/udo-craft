"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload } from "lucide-react";
import type { ContactData } from "./CartSummary";
import { NovaPoshtaPicker } from "./NovaPoshtaPicker";

export type CheckoutField = "name" | "phone" | "email" | "delivery";

/** Required-field errors for the checkout. Keys with null are valid. */
export function checkoutErrors(contact: ContactData, msg: { required: string; phone: string; email: string; branch: string }): Record<CheckoutField, string | null> {
  const digits = contact.phone.replace(/\D/g, "").length;
  return {
    name: contact.name.trim() ? null : msg.required,
    phone: !contact.phone.trim() ? msg.required : digits < 9 ? msg.phone : null,
    email: !contact.email.trim() ? msg.required : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email.trim()) ? null : msg.email,
    delivery:
      contact.delivery === "pickup" || contact.novaPoshtaDetails.trim()
        ? null
        : contact.delivery === "nova_poshta" ? msg.branch : msg.required,
  };
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  const id = `checkout-section-${n}`;
  return (
    <section aria-labelledby={id} className="rounded-card border border-border bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center self-center rounded-full bg-muted text-xs font-semibold text-muted-foreground" aria-hidden="true">{n}</span>
        <h2 id={id} className="text-h4 font-semibold">{title}</h2>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

interface ChoiceProps {
  name: string;
  value: string;
  current: string;
  label: string;
  desc: string;
  aside?: string;
  onSelect: (value: string) => void;
  children?: React.ReactNode;
}

/** Radio card: a native radio (keyboard and screen-reader behaviour for free) styled as a card. */
function Choice({ name, value, current, label, desc, aside, onSelect, children }: ChoiceProps) {
  const checked = current === value;
  return (
    <div className={`rounded-card border transition-colors duration-fast ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
      <label className="flex min-h-14 cursor-pointer items-center gap-3 p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring rounded-card">
        <input type="radio" name={name} value={value} checked={checked} onChange={() => onSelect(value)} className="peer sr-only" />
        <span className="size-5 shrink-0 rounded-full border border-input bg-background transition-[border-width,border-color] duration-fast peer-checked:border-[6px] peer-checked:border-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{desc}{aside && <span className="sm:hidden"> · {aside}</span>}</span>
        </span>
        {aside && <span className="shrink-0 text-sm font-medium text-muted-foreground max-sm:hidden">{aside}</span>}
      </label>
      {checked && children && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

interface ContactFormProps {
  contact: ContactData;
  setContact: (c: ContactData) => void;
  /** Field -> message, already filtered to what should be visible. */
  errors: Partial<Record<CheckoutField, string | null>>;
  onBlur: (field: CheckoutField) => void;
  extraFiles: File[];
  setExtraFiles: (files: File[]) => void;
}

export function ContactForm({ contact, setContact, errors, onBlur, extraFiles, setExtraFiles }: ContactFormProps) {
  const t = useTranslations("checkout");
  const tForm = useTranslations("contactForm");
  const set = (patch: Partial<ContactData>) => setContact({ ...contact, ...patch });

  const field = (id: string, key: CheckoutField) => ({
    id,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${id}-error` : undefined,
    onBlur: () => onBlur(key),
  });
  const FieldError = ({ id, field: key }: { id: string; field: CheckoutField }) =>
    errors[key] ? (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null;
  const labelCls = "mb-1.5 block text-sm font-medium";
  // Switching method clears the address: a branch is not a courier address.
  const setDelivery = (delivery: string) => set({ delivery, novaPoshtaDetails: "" });

  return (
    <div className="space-y-4">
      <Section n={1} title={t("contact.title")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="order-name" className={labelCls}>{t("contact.fullName")}</Label>
            <Input type="text" autoComplete="name" required value={contact.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder={t("contact.fullNamePlaceholder")}
              {...field("order-name", "name")} />
            <FieldError id="order-name" field="name" />
          </div>
          <div>
            <Label htmlFor="order-phone" className={labelCls}>{t("contact.phone")}</Label>
            <Input type="tel" autoComplete="tel" inputMode="tel" required value={contact.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder={t("contact.phonePlaceholder")}
              {...field("order-phone", "phone")} />
            <FieldError id="order-phone" field="phone" />
          </div>
          <div>
            <Label htmlFor="order-email" className={labelCls}>{t("contact.email")}</Label>
            <Input type="email" autoComplete="email" inputMode="email" required value={contact.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder={t("contact.emailPlaceholder")}
              {...field("order-email", "email")} />
            <FieldError id="order-email" field="email" />
          </div>
        </div>
      </Section>

      <Section n={2} title={t("company.title")} hint={t("optional")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="order-company" className={labelCls}>{t("company.nameLabel")}</Label>
            <Input id="order-company" type="text" autoComplete="organization" value={contact.company}
              onChange={(e) => set({ company: e.target.value })}
              placeholder={t("company.namePlaceholder")} />
          </div>
          <div>
            <Label htmlFor="order-taxid" className={labelCls}>{t("company.taxId")}</Label>
            <Input id="order-taxid" type="text" inputMode="numeric" autoComplete="off" value={contact.edrpou}
              onChange={(e) => set({ edrpou: e.target.value })}
              placeholder={t("company.taxIdPlaceholder")} />
          </div>
        </div>
      </Section>

      <Section n={3} title={t("deliveryTitle")}>
        <div role="radiogroup" aria-label={t("deliveryTitle")} className="space-y-2">
          <Choice name="delivery" value="nova_poshta" current={contact.delivery} onSelect={setDelivery}
            label={t("np.branch")} desc={t("delivery.options.nova_poshta.desc")} aside={t("byCarrier")}>
            <NovaPoshtaPicker value={contact.novaPoshtaDetails} onChange={(v) => set({ novaPoshtaDetails: v })}
              invalid={!!errors.delivery} describedBy={errors.delivery ? "order-delivery-error" : undefined} />
          </Choice>
          <Choice name="delivery" value="nova_poshta_courier" current={contact.delivery} onSelect={setDelivery}
            label={t("np.courier")} desc={t("delivery.options.nova_poshta.desc")} aside={t("byCarrier")}>
            <Input aria-label={t("np.courier")} type="text" autoComplete="street-address" value={contact.novaPoshtaDetails}
              onChange={(e) => set({ novaPoshtaDetails: e.target.value })}
              onBlur={() => onBlur("delivery")}
              aria-invalid={errors.delivery ? true : undefined}
              aria-describedby={errors.delivery ? "order-delivery-error" : undefined}
              placeholder={t("np.addressPlaceholder")} />
          </Choice>
          <Choice name="delivery" value="pickup" current={contact.delivery} onSelect={setDelivery}
            label={t("delivery.options.pickup.label")} desc={t("delivery.options.pickup.desc")} aside={t("free")} />
        </div>
        {errors.delivery && <p id="order-delivery-error" className="mt-2 text-sm text-destructive">{errors.delivery}</p>}
      </Section>

      <Section n={4} title={t("paymentTitle")}>
        <div role="radiogroup" aria-label={t("paymentTitle")} className="space-y-2">
          <Choice name="payment" value="card" current={contact.payment} onSelect={(payment) => set({ payment })}
            label={t("pay.card")} desc={t("pay.cardDesc")} />
          <Choice name="payment" value="invoice" current={contact.payment} onSelect={(payment) => set({ payment })}
            label={t("pay.invoice")} desc={t("pay.invoiceDesc")} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{t("finalPriceManager")}</p>
      </Section>

      <Section n={5} title={t("extrasTitle")} hint={t("optional")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="order-deadline" className={labelCls}>{t("delivery.deadline")}</Label>
            <Input id="order-deadline" type="date" value={contact.deadline} onChange={(e) => set({ deadline: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="order-social" className={labelCls}>{t("contact.social")}</Label>
            <div className="flex gap-2">
              <select aria-label={t("contact.social")} value={contact.socialNetwork}
                onChange={(e) => set({ socialNetwork: e.target.value })}
                className="h-11 shrink-0 rounded-full border border-input bg-transparent px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm">
                <option value="telegram">Telegram</option>
                <option value="instagram">Instagram</option>
                <option value="viber">Viber</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
              </select>
              <Input id="order-social" type="text" autoComplete="off" value={contact.socialHandle}
                onChange={(e) => set({ socialHandle: e.target.value })}
                placeholder={t("contact.socialPlaceholder")} className="min-w-0 flex-1" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="order-comment" className={labelCls}>{t("delivery.comment")}</Label>
            <textarea id="order-comment" value={contact.comment}
              onChange={(e) => set({ comment: e.target.value })}
              placeholder={t("delivery.commentPlaceholder")} rows={3}
              className="w-full resize-none rounded-card border border-input bg-transparent px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="order-source" className={labelCls}>{t("sourceLabel")}</Label>
            <Input id="order-source" type="text" autoComplete="off" value={contact.source} onChange={(e) => set({ source: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <p className={labelCls}>{tForm("filesLabel")}</p>
            <input type="file" multiple id="extra-files" className="peer sr-only"
              onChange={(e) => setExtraFiles(Array.from(e.target.files || []))} />
            <label htmlFor="extra-files"
              className="flex w-full cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-input p-5 transition-colors duration-fast hover:border-primary/40 hover:bg-muted/30 peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
              <Upload className="mb-1.5 size-5 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium text-muted-foreground">{tForm("filesClick")}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{tForm("filesDesc")}</span>
            </label>
            {extraFiles.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {extraFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/50 pl-3">
                    <span className="truncate text-sm">{f.name}</span>
                    <button type="button" aria-label={`${t("removeItem")}: ${f.name}`}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setExtraFiles(extraFiles.filter((_, idx) => idx !== i))}>
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

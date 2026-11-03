"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminSection } from "@/components/admin-layout";
import { FormPage } from "@/components/page-templates";
import { Field, PickSelect, leadOptions, useCreateDoc, useLookups } from "../../_lib/documents";

export default function NewProductionPage() {
  const { leads, skus, products } = useLookups();
  const { submit, saving } = useCreateDoc("/erp/production", "/api/erp/production-orders", "Замовлення на виробництво створено");
  const [f, setF] = useState({ lead_id: "", variant_sku_id: "", product_id: "", quantity: 1, due_date: "", comment: "" });

  const productId = f.product_id || products[0]?.id || "";

  return (
    <FormPage
      title="Новий виробничий документ"
      backHref="/erp/production"
      breadcrumbs={[{ label: "Виробництво", href: "/erp/production" }, { label: "Новий" }]}
      submitLabel="Створити документ"
      submitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        submit({
          lead_id: f.lead_id || null,
          notes: f.comment || null,
          lines: [{ variant_sku_id: f.variant_sku_id || null, product_id: productId || null, quantity: f.quantity, due_date: f.due_date || null, comment: f.comment }],
        });
      }}
    >
      <AdminSection title="Виробництво по замовленню">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Замовлення / клієнт">
            <PickSelect value={f.lead_id} onChange={(v) => setF({ ...f, lead_id: v })} placeholder="Замовлення" allowNone="Без замовлення" options={leadOptions(leads)} />
          </Field>
          <Field label="Варіація SKU">
            <PickSelect value={f.variant_sku_id} onChange={(v) => setF({ ...f, variant_sku_id: v })} placeholder="SKU" allowNone="Без SKU" options={skus.map((s) => ({ value: s.id, label: `${s.sku} · ${s.size}` }))} />
          </Field>
          <Field label="Продукт">
            <PickSelect value={productId} onChange={(v) => setF({ ...f, product_id: v })} placeholder="Продукт" options={products.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="Кількість">
            <Input type="number" min="1" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Термін">
            <Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Коментар">
          <Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Коментар для швеї, розкрій, пошиття, контроль..." />
        </Field>
      </AdminSection>
    </FormPage>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminSection } from "@/components/admin-layout";
import { FormPage } from "@/components/page-templates";
import { money } from "../../_lib/stock";
import { Field, PickSelect, useCreateDoc, useLookups, warehouseOptions } from "../../_lib/documents";

export default function NewReceiptPage() {
  const { materials, warehouses, suppliers } = useLookups();
  const { submit, saving } = useCreateDoc("/erp/receipts", "/api/erp/receipts", "Постачання оприбутковано");
  const [f, setF] = useState({ material_id: "", supplier_id: "", warehouse_id: "", quantity: 1, unit_cost: 0, comment: "" });

  const materialId = f.material_id || materials[0]?.id || "";
  const warehouseId = f.warehouse_id || warehouses[0]?.id || "";
  const material = materials.find((m) => m.id === materialId);

  return (
    <FormPage
      title="Нове постачання"
      backHref="/erp/receipts"
      breadcrumbs={[{ label: "Постачання", href: "/erp/receipts" }, { label: "Нове" }]}
      submitLabel="Оприбуткувати"
      submitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        if (!materialId) return toast.error("Оберіть матеріал");
        if (!(f.quantity > 0)) return toast.error("Вкажіть кількість");
        submit({
          supplier_id: f.supplier_id || null,
          warehouse_id: warehouseId || null,
          comment: f.comment,
          lines: [{ erp_material_id: materialId, unit: material?.unit ?? "шт.", quantity: f.quantity, unit_cost_cents: Math.round(f.unit_cost * 100) }],
        });
      }}
    >
      <AdminSection title="Постачання">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Товар / матеріал">
            <PickSelect value={materialId} onChange={(v) => setF({ ...f, material_id: v })} placeholder="Матеріал" options={materials.map((m) => ({ value: m.id, label: `${m.name} · ${m.unit}` }))} />
          </Field>
          <Field label="Постачальник">
            <PickSelect value={f.supplier_id} onChange={(v) => setF({ ...f, supplier_id: v })} placeholder="Постачальник" allowNone="Без постачальника" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
          <Field label="Склад">
            <PickSelect value={warehouseId} onChange={(v) => setF({ ...f, warehouse_id: v })} placeholder="Склад" options={warehouseOptions(warehouses)} />
          </Field>
          <Field label={`Кількість, ${material?.unit ?? "од."}`}>
            <Input type="number" min="0" step="0.001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Ціна, UAH">
            <Input type="number" min="0" step="0.01" value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: Number(e.target.value) })} />
          </Field>
          <Field label="Сума">
            <Input readOnly value={money(Math.round(f.quantity * f.unit_cost * 100))} />
          </Field>
        </div>
        <Field label="Коментар">
          <Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Партія, інвойс, коментар..." />
        </Field>
      </AdminSection>
    </FormPage>
  );
}

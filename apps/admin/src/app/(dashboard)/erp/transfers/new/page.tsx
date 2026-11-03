"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminSection } from "@/components/admin-layout";
import { FormPage } from "@/components/page-templates";
import { Field, PickSelect, useCreateDoc, useLookups, warehouseOptions } from "../../_lib/documents";

export default function NewTransferPage() {
  const { materials, warehouses } = useLookups();
  const { submit, saving } = useCreateDoc("/erp/transfers", "/api/erp/transfers", "Переміщення проведено");
  const [f, setF] = useState({ material_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: 1, comment: "" });

  const materialId = f.material_id || materials[0]?.id || "";
  const fromId = f.from_warehouse_id || warehouses[0]?.id || "";
  const toId = f.to_warehouse_id || warehouses[1]?.id || "";
  const material = materials.find((m) => m.id === materialId);

  return (
    <FormPage
      title="Нове переміщення"
      backHref="/erp/transfers"
      breadcrumbs={[{ label: "Переміщення", href: "/erp/transfers" }, { label: "Нове" }]}
      submitLabel="Перемістити"
      submitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        if (!materialId) return toast.error("Оберіть матеріал");
        if (fromId && fromId === toId) return toast.error("Склади переміщення мають відрізнятися");
        submit({
          from_warehouse_id: fromId || null,
          to_warehouse_id: toId || null,
          comment: f.comment,
          lines: [{ erp_material_id: materialId, quantity: f.quantity, unit: material?.unit ?? "шт." }],
        });
      }}
    >
      <AdminSection title="Переміщення між складами">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Матеріал">
            <PickSelect value={materialId} onChange={(v) => setF({ ...f, material_id: v })} placeholder="Матеріал" options={materials.map((m) => ({ value: m.id, label: m.name }))} />
          </Field>
          <Field label={`Кількість, ${material?.unit ?? "од."}`}>
            <Input type="number" min="0" step="0.001" value={f.quantity} onChange={(e) => setF({ ...f, quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Зі складу">
            <PickSelect value={fromId} onChange={(v) => setF({ ...f, from_warehouse_id: v })} placeholder="Склад" options={warehouseOptions(warehouses)} />
          </Field>
          <Field label="На склад">
            <PickSelect value={toId} onChange={(v) => setF({ ...f, to_warehouse_id: v })} placeholder="Склад" options={warehouseOptions(warehouses)} />
          </Field>
        </div>
        <Field label="Коментар">
          <Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Причина переміщення..." />
        </Field>
      </AdminSection>
    </FormPage>
  );
}

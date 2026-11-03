"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { AdminSection } from "@/components/admin-layout";
import { FormPage } from "@/components/page-templates";
import { Field, PickSelect, docNumber, useCreateDoc, useLookups, warehouseOptions } from "../../_lib/documents";

export default function NewActPage() {
  const { orders, warehouses, leads } = useLookups();
  const { submit, saving } = useCreateDoc("/erp/acts", "/api/erp/processing-acts", "Акт пошиття проведено");
  const [f, setF] = useState({ production_order_id: "", warehouse_id: "", comment: "" });

  const open = orders.filter((o) => o.status !== "done");
  const orderId = f.production_order_id || open[0]?.id || "";
  const warehouseId = f.warehouse_id || warehouses.find((w) => w.code === "READY")?.id || warehouses[0]?.id || "";

  return (
    <FormPage
      title="Новий акт пошиття"
      backHref="/erp/acts"
      breadcrumbs={[{ label: "Акти пошиття", href: "/erp/acts" }, { label: "Новий" }]}
      submitLabel="Провести акт"
      submitting={saving}
      onSubmit={(e) => {
        e.preventDefault();
        if (!orderId) return toast.error("Оберіть виробничий документ");
        submit({ production_order_id: orderId, warehouse_id: warehouseId || null, comment: f.comment });
      }}
    >
      <AdminSection title="Акт пошиття / переробки">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Виробничий документ">
            <PickSelect
              value={orderId}
              onChange={(v) => setF({ ...f, production_order_id: v })}
              placeholder="Документ"
              options={open.map((o) => ({ value: o.id, label: `${docNumber(o.id)} · ${o.quantity} шт. · ${leads.find((l) => l.id === o.lead_id)?.customer_data?.name ?? "без клієнта"}` }))}
            />
          </Field>
          <Field label="Склад готової продукції">
            <PickSelect value={warehouseId} onChange={(v) => setF({ ...f, warehouse_id: v })} placeholder="Склад" options={warehouseOptions(warehouses)} />
          </Field>
        </div>
        <Field label="Коментар">
          <Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Факт пошиття, брак, контроль якості..." />
        </Field>
      </AdminSection>
    </FormPage>
  );
}

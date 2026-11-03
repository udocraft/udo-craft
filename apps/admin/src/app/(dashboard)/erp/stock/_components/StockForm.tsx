"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormPage } from "@/components/page-templates";
import { EMPTY_FORM, MaterialFormFields, type MaterialForm, useStockData } from "../../_lib/stock";

/** Create (no `id`) or edit (with `id`) a stock item, then go to its detail page. */
export function StockForm({ id }: { id?: string }) {
  const router = useRouter();
  const { materials, types, loading } = useStockData();
  const [draft, setDraft] = useState<MaterialForm | null>(null);
  const [saving, setSaving] = useState(false);

  const existing = id ? materials.find((m) => m.id === id) : undefined;
  const form = draft ?? (id ? (existing ? { ...existing } : null) : EMPTY_FORM);
  const backHref = id ? `/erp/stock/${id}` : "/erp/stock";

  if (loading || !form) {
    return (
      <FormPage title={id ? "Редагувати позицію" : "Нова позиція"} backHref={backHref} onSubmit={(e) => e.preventDefault()} submitting>
        <p className="text-sm text-muted-foreground">{loading ? "Завантаження..." : "Позицію не знайдено"}</p>
      </FormPage>
    );
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Вкажіть назву позиції");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(id ? `/api/erp/materials/${id}` : "/api/erp/materials", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sku: form.sku || null, supplier: form.supplier || null, notes: form.notes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Помилка збереження");
      const saved = await res.json();
      toast.success(id ? "Позицію оновлено" : "Позицію створено");
      router.push(`/erp/stock/${saved.id ?? id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження");
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={id ? "Редагувати позицію" : "Нова позиція"}
      subtitle="Тканини, готові основи, фурнітура, нитки, матеріали друку, робота і послуги."
      backHref={backHref}
      breadcrumbs={[{ label: "Склад", href: "/erp/stock" }, { label: id ? form.name : "Нова позиція" }]}
      onSubmit={submit}
      submitting={saving}
    >
      <MaterialFormFields form={form} types={types} onFormChange={setDraft} />
    </FormPage>
  );
}

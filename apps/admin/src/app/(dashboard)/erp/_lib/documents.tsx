"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ErpMaterial, ErpSupplier, ErpWarehouse, ProductVariantSku } from "@udo-craft/shared";

export type Product = { id: string; name: string; slug: string };
export type LeadOption = {
  id: string;
  status: string;
  customer_data?: { name?: string; email?: string; keycrm_id?: string };
};
export type ProductionLine = {
  id: string;
  quantity: number;
  due_date?: string | null;
  comment?: string | null;
  variant_sku?: ProductVariantSku | null;
  product?: Product | null;
  material_requirements?: Array<{ material?: ErpMaterial; required_quantity: number; available_quantity: number; shortage_quantity: number }>;
};
export type ProductionOrder = {
  id: string;
  created_at?: string;
  status: string;
  quantity: number;
  lead_id?: string | null;
  notes?: string | null;
  lines?: ProductionLine[];
};
export type Receipt = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  comment?: string;
  supplier?: ErpSupplier;
  warehouse?: ErpWarehouse;
  lines: Array<{ id: string; quantity: number; unit_cost_cents: number; material: ErpMaterial }>;
};
export type Act = {
  id: string;
  created_at: string;
  status: string;
  comment?: string;
  warehouse?: ErpWarehouse;
  production_order?: ProductionOrder;
};
export type Transfer = {
  id: string;
  created_at: string;
  status: string;
  comment?: string;
  from_warehouse?: ErpWarehouse;
  to_warehouse?: ErpWarehouse;
  lines: Array<{ id: string; quantity: number; material: ErpMaterial }>;
};

export const docNumber = (id?: string) => (id ? `#${id.slice(0, 8).toUpperCase()}` : "—");
export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("uk-UA") : "—");

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

/** Loads one document list (receipts, acts, ...). `refetch` reloads it. */
export function useDocs<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setItems(await getJson<T[]>(endpoint, []));
    setLoading(false);
  }, [endpoint]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, refetch };
}

/** Reference data the document forms pick from. */
export function useLookups() {
  const [data, setData] = useState({
    materials: [] as ErpMaterial[],
    warehouses: [] as ErpWarehouse[],
    suppliers: [] as ErpSupplier[],
    products: [] as Product[],
    skus: [] as ProductVariantSku[],
    leads: [] as LeadOption[],
    orders: [] as ProductionOrder[],
  });

  useEffect(() => {
    Promise.all([
      getJson<ErpMaterial[]>("/api/erp/materials", []),
      getJson<ErpWarehouse[]>("/api/erp/warehouses", []),
      getJson<ErpSupplier[]>("/api/erp/suppliers", []),
      getJson<Product[]>("/api/products", []),
      getJson<ProductVariantSku[]>("/api/erp/variant-skus", []),
      getJson<LeadOption[]>("/api/leads?limit=80", []),
      getJson<ProductionOrder[]>("/api/erp/production-orders", []),
    ]).then(([materials, warehouses, suppliers, products, skus, leads, orders]) =>
      setData({ materials, warehouses, suppliers, products, skus, leads, orders }),
    );
  }, []);

  return data;
}

/** POSTs a document, then opens it. Documents are immutable once posted. */
export function useCreateDoc(listHref: string, url: string, success: string) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const submit = async (body: unknown) => {
    setSaving(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "Помилка документа");
      const saved = await res.json();
      toast.success(success);
      router.push(saved?.id ? `${listHref}/${saved.id}` : listHref);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка документа");
      setSaving(false);
    }
  };

  return { submit, saving };
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function PickSelect({
  value,
  onChange,
  options,
  placeholder,
  allowNone,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  /** Adds an empty choice labelled with this text. */
  allowNone?: string;
}) {
  const label = options.find((o) => o.value === value)?.label ?? (value === "" && allowNone ? allowNone : placeholder);
  return (
    <Select value={value || (allowNone ? "none" : "")} onValueChange={(next) => onChange(!next || next === "none" ? "" : next)}>
      <SelectTrigger className="w-full"><span>{label}</span></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{allowNone}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export const warehouseOptions = (list: ErpWarehouse[]) => list.map((w) => ({ value: w.id, label: w.name }));
export const leadOptions = (list: LeadOption[]) =>
  list.map((l) => ({ value: l.id, label: `${l.customer_data?.name ?? "Клієнт"} · ${l.status}` }));

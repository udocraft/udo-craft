"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardCheck,
  Edit3,
  Factory,
  Loader2,
  PackagePlus,
  Repeat2,
  Search,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AdminTablePanel, AdminToolbar, AdminFilter, AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";

const TABS = [
  { key: "stock", label: "Залишки" },
  { key: "receipts", label: "Постачання" },
  { key: "production", label: "Виробництво" },
  { key: "acts", label: "Акти пошиття" },
  { key: "transfers", label: "Переміщення" },
] as const;
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SelectValue } from "@/components/ui/select";
import type { ErpMaterial, ErpMaterialKind, ErpMaterialType, ErpSupplier, ErpWarehouse, ProductVariantSku } from "@udo-craft/shared";

type MaterialWithType = ErpMaterial & { type?: ErpMaterialType | null };
type MaterialForm = Omit<ErpMaterial, "id"> & { id?: string };
type TypeForm = Omit<ErpMaterialType, "id"> & { id?: string };
type Product = { id: string; name: string; slug: string };
type LeadOption = {
  id: string;
  status: string;
  customer_data?: { name?: string; email?: string; keycrm_id?: string };
  total_amount_cents?: number;
  created_at?: string;
};
type ProductionOrder = {
  id: string;
  status: string;
  quantity: number;
  lead_id?: string | null;
  notes?: string | null;
  lines?: ProductionLine[];
};
type ProductionLine = {
  id: string;
  quantity: number;
  due_date?: string | null;
  comment?: string | null;
  variant_sku?: ProductVariantSku | null;
  product?: Product | null;
  material_requirements?: Array<{ material?: ErpMaterial; required_quantity: number; available_quantity: number; shortage_quantity: number }>;
};

type ReceiptHistory = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  comment?: string;
  supplier?: ErpSupplier;
  warehouse?: ErpWarehouse;
  lines: Array<{ id: string; quantity: number; unit_cost_cents: number; material: ErpMaterial }>;
};

type ActHistory = {
  id: string;
  created_at: string;
  status: string;
  comment?: string;
  warehouse?: ErpWarehouse;
  production_order?: ProductionOrder;
};

type TransferHistory = {
  id: string;
  created_at: string;
  status: string;
  comment?: string;
  from_warehouse?: ErpWarehouse;
  to_warehouse?: ErpWarehouse;
  lines: Array<{ id: string; quantity: number; material: ErpMaterial }>;
};

const KINDS: { value: ErpMaterialKind; label: string; unit: string }[] = [
  { value: "fabric", label: "Тканина", unit: "м" },
  { value: "garment", label: "Готова основа", unit: "шт." },
  { value: "print_supply", label: "Матеріали друку", unit: "шт." },
  { value: "hardware", label: "Фурнітура", unit: "шт." },
  { value: "thread", label: "Нитки", unit: "м" },
  { value: "packaging", label: "Пакування", unit: "шт." },
  { value: "service", label: "Послуга", unit: "посл." },
  { value: "labor", label: "Робота", unit: "год." },
  { value: "other", label: "Інше", unit: "шт." },
];

const EMPTY_FORM: MaterialForm = {
  name: "",
  sku: "",
  type_id: null,
  kind: "fabric",
  unit: "м",
  unit_cost_cents: 0,
  stock_quantity: 0,
  reserved_quantity: 0,
  reorder_point: 0,
  supplier: "",
  notes: "",
  is_active: true,
  sort_order: 0,
};

const EMPTY_TYPE: TypeForm = {
  name: "",
  kind: "other",
  unit: "шт.",
  color: "#64748b",
  sort_order: 0,
  is_active: true,
};

const money = (cents: number) => `${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UAH`;
const kindLabel = (kind: string) => KINDS.find((k) => k.value === kind)?.label ?? kind;

export default function WarehousePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "stock";

  const [materials, setMaterials] = useState<MaterialWithType[]>([]);
  const [types, setTypes] = useState<ErpMaterialType[]>([]);
  const [warehouses, setWarehouses] = useState<ErpWarehouse[]>([]);
  const [suppliers, setSuppliers] = useState<ErpSupplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variantSkus, setVariantSkus] = useState<ProductVariantSku[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [receipts, setReceipts] = useState<ReceiptHistory[]>([]);
  const [acts, setActs] = useState<ActHistory[]>([]);
  const [transfers, setTransfers] = useState<TransferHistory[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processSaving, setProcessSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [receipt, setReceipt] = useState({ material_id: "", supplier_id: "", warehouse_id: "", quantity: 1, unit_cost: 0, comment: "" });
  const [production, setProduction] = useState({ lead_id: "", variant_sku_id: "", product_id: "", quantity: 1, due_date: "", comment: "" });
  const [act, setAct] = useState({ production_order_id: "", warehouse_id: "", comment: "" });
  const [transfer, setTransfer] = useState({ material_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: 1, comment: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [materialsRes, typesRes, warehousesRes, suppliersRes, productsRes, skusRes, ordersRes, leadsRes, receiptsRes, actsRes, transfersRes] = await Promise.all([
        fetch("/api/erp/materials"),
        fetch("/api/erp/types"),
        fetch("/api/erp/warehouses"),
        fetch("/api/erp/suppliers"),
        fetch("/api/products"),
        fetch("/api/erp/variant-skus"),
        fetch("/api/erp/production-orders"),
        fetch("/api/leads?limit=80"),
        fetch("/api/erp/receipts"),
        fetch("/api/erp/processing-acts"),
        fetch("/api/erp/transfers"),
      ]);
      if (!materialsRes.ok) throw new Error("ERP tables are not ready");
      const [materialsData, typesData, warehousesData, suppliersData, productsData, skusData, ordersData, leadsData, receiptsData, actsData, transfersData] = await Promise.all([
        materialsRes.json(),
        typesRes.ok ? typesRes.json() : [],
        warehousesRes.ok ? warehousesRes.json() : [],
        suppliersRes.ok ? suppliersRes.json() : [],
        productsRes.ok ? productsRes.json() : [],
        skusRes.ok ? skusRes.json() : [],
        ordersRes.ok ? ordersRes.json() : [],
        leadsRes.ok ? leadsRes.json() : [],
        receiptsRes.ok ? receiptsRes.json() : [],
        actsRes.ok ? actsRes.json() : [],
        transfersRes.ok ? transfersRes.json() : [],
      ]);
      setMaterials(materialsData);
      setTypes(typesData);
      setWarehouses(warehousesData);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setVariantSkus(skusData);
      setOrders(ordersData);
      setLeads(leadsData);
      setReceipts(receiptsData);
      setActs(actsData);
      setTransfers(transfersData);
      setReceipt((prev) => ({ ...prev, material_id: prev.material_id || materialsData[0]?.id || "", warehouse_id: prev.warehouse_id || warehousesData[0]?.id || "" }));
      setProduction((prev) => ({ ...prev, lead_id: prev.lead_id || leadsData[0]?.id || "", variant_sku_id: prev.variant_sku_id || skusData[0]?.id || "", product_id: prev.product_id || productsData[0]?.id || "" }));
      setAct((prev) => ({ ...prev, production_order_id: prev.production_order_id || ordersData[0]?.id || "", warehouse_id: prev.warehouse_id || warehousesData.find((w: ErpWarehouse) => w.code === "READY")?.id || warehousesData[0]?.id || "" }));
      setTransfer((prev) => ({ ...prev, material_id: prev.material_id || materialsData[0]?.id || "", from_warehouse_id: prev.from_warehouse_id || warehousesData[0]?.id || "", to_warehouse_id: prev.to_warehouse_id || warehousesData[1]?.id || "" }));
    } catch {
      toast.error("Не вдалося завантажити склад. Перевірте, що ERP-міграція застосована.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return materials.filter((m) => {
      const matchesType = typeFilter === "all" || (typeFilter === "none" ? !m.type_id : m.type_id === typeFilter);
      const matchesQuery = !needle || [m.name, m.sku, m.kind, m.supplier, m.type?.name].some((value) => String(value ?? "").toLowerCase().includes(needle));
      return matchesType && matchesQuery;
    });
  }, [materials, query, typeFilter]);

  const itemCountLabel = `${filtered.length} ${
    filtered.length === 1 ? "позиція" : filtered.length > 1 && filtered.length < 5 ? "позиції" : "позицій"
  }`;
  const selectedMaterial = useMemo(() => materials.find((m) => m.id === receipt.material_id), [materials, receipt.material_id]);
  const leadById = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads]);

  async function postProcess(kind: string, url: string, body: unknown, success: string) {
    setProcessSaving(kind);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || "Помилка документа");
      toast.success(success);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка документа");
    } finally {
      setProcessSaving(null);
    }
  }

  const createNew = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const edit = (material: ErpMaterial) => {
    setForm({ ...material });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Вкажіть назву позиції");
      return;
    }
    setSaving(true);
    const url = form.id ? `/api/erp/materials/${form.id}` : "/api/erp/materials";
    const method = form.id ? "PATCH" : "POST";

    try {
      const payload = {
        ...form,
        sku: form.sku || null,
        supplier: form.supplier || null,
        notes: form.notes || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка збереження");
      }
      toast.success(form.id ? "Позицію оновлено" : "Позицію створено");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (material: ErpMaterial) => {
    if (!confirm(`Видалити "${material.name}"?`)) return;
    try {
      const res = await fetch(`/api/erp/materials/${material.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Позицію видалено");
      fetchData();
    } catch {
      toast.error("Не вдалося видалити позицію. Можливо, вона використовується в рецептурах товарів.");
    }
  };

  return (
    <DashboardPage
      title="Склад"
      maxWidth="7xl"
      titleAccessory={
        <AdminTabs
          tabs={TABS}
          value={currentTab as any}
          onValueChange={(next) => router.push(`/warehouse?tab=${next}`)}
        />
      }
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setTypesOpen(true)}>
            Типи
          </Button>
          <Button size="sm" onClick={createNew}>
            Створити
          </Button>
        </>
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentTab === "stock" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <AdminToolbar>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Швидкий пошук..."
                />
              </div>

              <div className="flex items-center gap-2">
                <AdminFilter
                  label="Тип"
                  active={typeFilter !== "all"}
                  value={typeFilter === "all" ? undefined : typeFilter === "none" ? "Без типу" : types.find((t) => t.id === typeFilter)?.name}
                  onClear={() => setTypeFilter("all")}
                  icon={Tag}
                  onClick={() => document.getElementById("type-filter-trigger")?.click()}
                />
                <Select value={typeFilter} onValueChange={(value) => value && setTypeFilter(value)}>
                  <SelectTrigger className="sr-only h-0 w-0 p-0" id="type-filter-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі типи</SelectItem>
                    <SelectItem value="none">Без типу</SelectItem>
                    {types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{itemCountLabel}</span>
            </AdminToolbar>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <AdminTablePanel>
                  <Table className="min-w-[1040px]">
                    <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="h-11">Номенклатура</TableHead>
                      <TableHead className="h-11">Тип</TableHead>
                      <TableHead className="h-11 text-right">Собівартість</TableHead>
                      <TableHead className="h-11 text-right">Залишок</TableHead>
                      <TableHead className="h-11 text-right">Резерв</TableHead>
                      <TableHead className="h-11 text-right">Доступно</TableHead>
                      <TableHead className="h-11 text-right">Мін.</TableHead>
                      <TableHead className="h-11">Постачальник</TableHead>
                      <TableHead className="h-11 w-32 text-right">Дії</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-14 text-center text-sm text-muted-foreground">
                          Немає позицій. Створіть тканину, фурнітуру, нитки, матеріали друку або роботу.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((m) => {
                      const available = Number(m.stock_quantity || 0) - Number(m.reserved_quantity || 0);
                      const isLow = Number(m.reorder_point || 0) > 0 && Number(m.stock_quantity || 0) <= Number(m.reorder_point || 0);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            <button className="text-left font-medium hover:text-primary" onClick={() => edit(m)}>{m.name}</button>
                            <div className="text-[10px] text-muted-foreground">{m.sku || "Без SKU"} · {m.unit}</div>
                          </TableCell>
                          <TableCell>
                            {m.type ? (
                              <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px]">
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.type.color }} />
                                {m.type.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs tabular-nums">{money(m.unit_cost_cents)} / {m.unit}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            <span className={isLow ? "font-semibold text-amber-700" : ""}>{Number(m.stock_quantity).toLocaleString("uk-UA")} {m.unit}</span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{Number(m.reserved_quantity).toLocaleString("uk-UA")} {m.unit}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{available.toLocaleString("uk-UA")} {m.unit}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">{Number(m.reorder_point).toLocaleString("uk-UA")} {m.unit}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{m.supplier || "—"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => edit(m)}>
                              Редагувати
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => remove(m)}>
                              Видалити
                            </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </AdminTablePanel>
              )}
            </div>
          </div>
        )}

        {currentTab === "receipts" && (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <ProcessPanel icon={PackagePlus} title="Постачання на склад">
                <div className="grid gap-3">
                  <Field label="Товар / матеріал"><Select value={receipt.material_id} onValueChange={(v) => setReceipt({ ...receipt, material_id: v ?? "" })}><SelectTrigger><span>{selectedMaterial?.name ?? "Матеріал"}</span></SelectTrigger><SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.unit}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Постачальник"><Select value={receipt.supplier_id || "none"} onValueChange={(v) => setReceipt({ ...receipt, supplier_id: v === "none" || !v ? "" : v })}><SelectTrigger><span>{suppliers.find((s) => s.id === receipt.supplier_id)?.name ?? "Без постачальника"}</span></SelectTrigger><SelectContent><SelectItem value="none">Без постачальника</SelectItem>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Склад"><WarehouseSelect value={receipt.warehouse_id} warehouses={warehouses} onChange={(v) => setReceipt({ ...receipt, warehouse_id: v })} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Кількість, ${selectedMaterial?.unit ?? "од."}`}><Input type="number" min="0" step="0.001" value={receipt.quantity} onChange={(e) => setReceipt({ ...receipt, quantity: Number(e.target.value) })} /></Field>
                    <Field label="Ціна, UAH"><Input type="number" min="0" step="0.01" value={receipt.unit_cost} onChange={(e) => setReceipt({ ...receipt, unit_cost: Number(e.target.value) })} /></Field>
                  </div>
                  <Field label="Сума"><Input readOnly value={money(Math.round(receipt.quantity * receipt.unit_cost * 100))} /></Field>
                </div>
                <Textarea rows={2} value={receipt.comment} onChange={(e) => setReceipt({ ...receipt, comment: e.target.value })} placeholder="Партія, інвойс, коментар..." />
                <Button onClick={() => postProcess("receipt", "/api/erp/receipts", { supplier_id: receipt.supplier_id || null, warehouse_id: receipt.warehouse_id || null, comment: receipt.comment, lines: [{ erp_material_id: receipt.material_id, unit: selectedMaterial?.unit ?? "шт.", quantity: receipt.quantity, unit_cost_cents: Math.round(receipt.unit_cost * 100) }] }, "Постачання оприбутковано")} disabled={processSaving === "receipt"}>
                  {processSaving === "receipt" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}Оприбуткувати
                </Button>
              </ProcessPanel>

              <AdminTablePanel>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="h-11">Дата</TableHead>
                      <TableHead className="h-11">Постачальник</TableHead>
                      <TableHead className="h-11">Матеріали</TableHead>
                      <TableHead className="h-11 text-right">Сума</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Історія постачань порожня</TableCell></TableRow>}
                    {receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("uk-UA")}</TableCell>
                        <TableCell className="font-medium">{r.supplier?.name ?? "—"}</TableCell>
                        <TableCell>
                          {r.lines.map((line) => (
                            <div key={line.id} className="text-xs">
                              {line.material.name} · {line.quantity} {line.material.unit}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right font-medium">{money(r.total_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminTablePanel>
            </div>
          </div>
        )}

        {currentTab === "production" && (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <ProcessPanel icon={ClipboardCheck} title="Виробництво по замовленню">
                <div className="grid gap-3">
                  <Field label="Замовлення / клієнт"><LeadSelect value={production.lead_id} leads={leads} onChange={(v) => setProduction({ ...production, lead_id: v })} /></Field>
                  <Field label="Варіація SKU"><Select value={production.variant_sku_id || "none"} onValueChange={(v) => setProduction({ ...production, variant_sku_id: v === "none" || !v ? "" : v })}><SelectTrigger><span>{variantSkus.find((s) => s.id === production.variant_sku_id)?.sku ?? "Без SKU"}</span></SelectTrigger><SelectContent><SelectItem value="none">Без SKU</SelectItem>{variantSkus.map((s) => <SelectItem key={s.id} value={s.id}>{s.sku} · {s.size}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Продукт"><Select value={production.product_id} onValueChange={(v) => setProduction({ ...production, product_id: v ?? "" })}><SelectTrigger><span>{products.find((p) => p.id === production.product_id)?.name ?? "Продукт"}</span></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Кількість"><Input type="number" min="1" value={production.quantity} onChange={(e) => setProduction({ ...production, quantity: Number(e.target.value) })} /></Field>
                    <Field label="Термін"><Input type="date" value={production.due_date} onChange={(e) => setProduction({ ...production, due_date: e.target.value })} /></Field>
                  </div>
                </div>
                <Textarea rows={2} value={production.comment} onChange={(e) => setProduction({ ...production, comment: e.target.value })} placeholder="Коментар для швеї, розкрій, пошиття, контроль..." />
                <Button onClick={() => postProcess("production", "/api/erp/production-orders", { lead_id: production.lead_id || null, notes: production.comment || null, lines: [{ variant_sku_id: production.variant_sku_id || null, product_id: production.product_id || null, quantity: production.quantity, due_date: production.due_date || null, comment: production.comment }] }, "Замовлення на виробництво створено")} disabled={processSaving === "production"}>
                  {processSaving === "production" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}Створити документ
                </Button>
              </ProcessPanel>

              <AdminTablePanel>
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="h-11">Документ</TableHead>
                      <TableHead className="h-11">Замовлення / клієнт</TableHead>
                      <TableHead className="h-11">Виріб</TableHead>
                      <TableHead className="h-11 text-right">К-сть</TableHead>
                      <TableHead className="h-11">Статус</TableHead>
                      <TableHead className="h-11">Коментар</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Виробничих документів ще немає.</TableCell>
                      </TableRow>
                    )}
                    {orders.map((order) => {
                      const lead = leadById.get(order.lead_id || "");
                      const firstLine = order.lines?.[0];
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-xs">#{order.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{lead?.customer_data?.name ?? "Не прив'язано"}</div>
                            <div className="text-[10px] text-muted-foreground">{lead ? `${lead.status}${lead.customer_data?.keycrm_id ? ` · KeyCRM #${lead.customer_data.keycrm_id}` : ""}` : "—"}</div>
                          </TableCell>
                          <TableCell className="text-sm">{firstLine?.variant_sku?.sku ?? firstLine?.product?.name ?? "Виріб"}</TableCell>
                          <TableCell className="text-right tabular-nums text-sm">{order.quantity}</TableCell>
                          <TableCell><Badge variant={order.status === "completed" || order.status === "done" ? "default" : "secondary"} className="text-[10px] h-5">{order.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{firstLine?.comment || order.notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </AdminTablePanel>
            </div>
          </div>
        )}

        {currentTab === "acts" && (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <ProcessPanel icon={Factory} title="Акт пошиття / переробки">
                <div className="grid gap-3">
                  <Field label="Виробничий документ"><Select value={act.production_order_id} onValueChange={(v) => setAct({ ...act, production_order_id: v ?? "" })}><SelectTrigger><span>{orders.find((o) => o.id === act.production_order_id)?.id.slice(0, 8).toUpperCase() ?? "Документ"}</span></SelectTrigger><SelectContent>{orders.filter(o => o.status !== 'done').map((o) => <SelectItem key={o.id} value={o.id}>#{o.id.slice(0, 8).toUpperCase()} · {o.quantity} шт. · {leadById.get(o.lead_id || "")?.customer_data?.name ?? "без клієнта"}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Склад готової продукції"><WarehouseSelect value={act.warehouse_id} warehouses={warehouses} onChange={(v) => setAct({ ...act, warehouse_id: v })} /></Field>
                </div>
                <Textarea rows={2} value={act.comment} onChange={(e) => setAct({ ...act, comment: e.target.value })} placeholder="Факт пошиття, брак, контроль якості..." />
                <Button onClick={() => postProcess("act", "/api/erp/processing-acts", { production_order_id: act.production_order_id, warehouse_id: act.warehouse_id || null, comment: act.comment }, "Акт пошиття проведено")} disabled={processSaving === "act"}>
                  {processSaving === "act" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Factory className="h-4 w-4" />}Провести акт
                </Button>
              </ProcessPanel>

              <AdminTablePanel>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="h-11">Дата</TableHead>
                      <TableHead className="h-11">Документ</TableHead>
                      <TableHead className="h-11">Склад</TableHead>
                      <TableHead className="h-11">Коментар</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acts.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Історія актів порожня</TableCell></TableRow>}
                    {acts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("uk-UA")}</TableCell>
                        <TableCell className="font-medium">#{a.production_order?.id.slice(0, 8).toUpperCase()}</TableCell>
                        <TableCell className="text-sm">{a.warehouse?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.comment || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminTablePanel>
            </div>
          </div>
        )}

        {currentTab === "transfers" && (
          <div className="flex-1 overflow-auto p-4 md:p-6">
            <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
              <ProcessPanel icon={Repeat2} title="Переміщення між складами">
                <div className="grid gap-3">
                  <Field label="Матеріал"><Select value={transfer.material_id} onValueChange={(v) => setTransfer({ ...transfer, material_id: v ?? "" })}><SelectTrigger><span>{materials.find((m) => m.id === transfer.material_id)?.name ?? "Матеріал"}</span></SelectTrigger><SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Зі складу"><WarehouseSelect value={transfer.from_warehouse_id} warehouses={warehouses} onChange={(v) => setTransfer({ ...transfer, from_warehouse_id: v })} /></Field>
                    <Field label="На склад"><WarehouseSelect value={transfer.to_warehouse_id} warehouses={warehouses} onChange={(v) => setTransfer({ ...transfer, to_warehouse_id: v })} /></Field>
                  </div>
                  <Field label="Кількість"><Input type="number" min="0" step="0.001" value={transfer.quantity} onChange={(e) => setTransfer({ ...transfer, quantity: Number(e.target.value) })} /></Field>
                </div>
                <Textarea rows={2} value={transfer.comment} onChange={(e) => setTransfer({ ...transfer, comment: e.target.value })} placeholder="Причина переміщення..." />
                <Button onClick={() => postProcess("transfer", "/api/erp/transfers", { from_warehouse_id: transfer.from_warehouse_id || null, to_warehouse_id: transfer.to_warehouse_id || null, comment: transfer.comment, lines: [{ erp_material_id: transfer.material_id, quantity: transfer.quantity, unit: materials.find((m) => m.id === transfer.material_id)?.unit ?? "шт." }] }, "Переміщення проведено")} disabled={processSaving === "transfer"}>
                  {processSaving === "transfer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}Перемістити
                </Button>
              </ProcessPanel>

              <AdminTablePanel>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="h-11">Дата</TableHead>
                      <TableHead className="h-11">Звідки -&gt; Куди</TableHead>
                      <TableHead className="h-11">Матеріали</TableHead>
                      <TableHead className="h-11">Коментар</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground text-sm">Історія переміщень порожня</TableCell></TableRow>}
                    {transfers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("uk-UA")}</TableCell>
                        <TableCell className="text-sm font-medium">{t.from_warehouse?.name} -&gt; {t.to_warehouse?.name}</TableCell>
                        <TableCell>
                          {t.lines.map((line) => (
                            <div key={line.id} className="text-xs">
                              {line.material.name} · {line.quantity} {line.material.unit}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.comment || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AdminTablePanel>
            </div>
          </div>
        )}
      </div>

      <MaterialDialog
        open={dialogOpen}
        form={form}
        saving={saving}
        onOpenChange={setDialogOpen}
        onFormChange={setForm}
        onSave={save}
        types={types}
      />
      <TypesDialog
        open={typesOpen}
        types={types}
        onOpenChange={setTypesOpen}
        onRefresh={fetchData}
      />
    </DashboardPage>
  );
}

function MaterialDialog({
  open,
  form,
  saving,
  types,
  onOpenChange,
  onFormChange,
  onSave,
}: {
  open: boolean;
  form: MaterialForm;
  saving: boolean;
  types: ErpMaterialType[];
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: MaterialForm) => void;
  onSave: () => void;
}) {
  const setType = (typeId: string) => {
    if (typeId === "none") {
      onFormChange({ ...form, type_id: null });
      return;
    }
    const type = types.find((item) => item.id === typeId);
    onFormChange({
      ...form,
      type_id: typeId,
      kind: type?.kind ?? form.kind,
      unit: type?.unit ?? form.unit,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Редагувати позицію складу" : "Створити позицію складу"}</DialogTitle>
          <DialogDescription>
            Для виробництва текстилю зберігайте тут тканини, готові основи, фурнітуру, нитки, витратні матеріали друку, роботу і послуги.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Назва">
            <Input value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} placeholder="Тканина футер чорний" />
          </Field>
          <Field label="SKU / артикул">
            <Input value={form.sku ?? ""} onChange={(e) => onFormChange({ ...form, sku: e.target.value })} placeholder="FAB-BLK-001" />
          </Field>
          <Field label="Тип">
            <Select
              value={form.type_id ?? "none"}
              onValueChange={(value) => value && setType(value)}
            >
              <SelectTrigger className="w-full">
                <span>{form.type_id ? types.find((c) => c.id === form.type_id)?.name ?? "Тип" : "Без типу"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без типу</SelectItem>
                {types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Одиниця виміру">
            <Input value={form.unit} onChange={(e) => onFormChange({ ...form, unit: e.target.value })} placeholder="м / шт. / год." />
          </Field>
          <Field label="Ціна за одиницю, ₴">
            <Input type="number" min="0" step="0.01" value={form.unit_cost_cents / 100} onChange={(e) => onFormChange({ ...form, unit_cost_cents: Math.round(Number(e.target.value) * 100) })} />
          </Field>
          <Field label="Постачальник">
            <Input value={form.supplier ?? ""} onChange={(e) => onFormChange({ ...form, supplier: e.target.value })} placeholder="Назва або контакт" />
          </Field>
          <Field label="Залишок">
            <Input type="number" step="0.001" value={form.stock_quantity} onChange={(e) => onFormChange({ ...form, stock_quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Зарезервовано">
            <Input type="number" step="0.001" value={form.reserved_quantity} onChange={(e) => onFormChange({ ...form, reserved_quantity: Number(e.target.value) })} />
          </Field>
          <Field label="Мінімальний залишок">
            <Input type="number" step="0.001" value={form.reorder_point} onChange={(e) => onFormChange({ ...form, reorder_point: Number(e.target.value) })} />
          </Field>
          <Field label="Нотатки">
            <Input value={form.notes ?? ""} onChange={(e) => onFormChange({ ...form, notes: e.target.value })} placeholder="Ширина рулону, колір, партія, умови закупівлі" />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Зберегти
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypesDialog({
  open,
  types,
  onOpenChange,
  onRefresh,
}: {
  open: boolean;
  types: ErpMaterialType[];
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}) {
  const [form, setForm] = useState<TypeForm>(EMPTY_TYPE);
  const [saving, setSaving] = useState(false);

  const reset = () => setForm(EMPTY_TYPE);

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Вкажіть назву типу");
      return;
    }

    setSaving(true);
    const url = form.id ? `/api/erp/types/${form.id}` : "/api/erp/types";
    const method = form.id ? "PATCH" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка збереження");
      }
      toast.success(form.id ? "Тип оновлено" : "Тип створено");
      reset();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type: ErpMaterialType) => {
    if (!confirm(`Видалити тип "${type.name}"?`)) return;
    try {
      const res = await fetch(`/api/erp/types/${type.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Тип видалено");
      if (form.id === type.id) reset();
      onRefresh();
    } catch {
      toast.error("Не вдалося видалити тип");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Типи складу</DialogTitle>
          <DialogDescription>Редагуйте стандартні типи або додавайте власні.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_130px_88px_88px_96px]">
          <Field label="Назва">
            <Input autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Тканини для худі" />
          </Field>
          <Field label="Клас">
            <Select value={form.kind} onValueChange={(value) => setForm({ ...form, kind: value as ErpMaterialKind, unit: KINDS.find((k) => k.value === value)?.unit || "шт." })}>
              <SelectTrigger className="w-full"><span>{kindLabel(form.kind)}</span></SelectTrigger>
              <SelectContent>
                {KINDS.map((kind) => <SelectItem key={kind.value} value={kind.value}>{kind.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Од.">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Колір">
            <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
          </Field>
          <Field label="Сортування">
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {types.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">Типів ще немає</div>
          ) : types.map((type) => (
            <div key={type.id} className="flex items-center gap-3 border-t px-3 py-2 first:border-t-0">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: type.color }} />
              <button className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary" onClick={() => setForm({ ...type })}>
                {type.name}
              </button>
              <span className="text-xs text-muted-foreground">{type.unit}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setForm({ ...type })}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(type)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={reset}>Очистити</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {form.id ? "Оновити" : "Створити"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ProcessPanel({ icon: Icon, title, children }: { icon: typeof PackagePlus; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function WarehouseSelect({ value, warehouses, onChange }: { value: string; warehouses: ErpWarehouse[]; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next ?? "")}>
      <SelectTrigger><span>{warehouses.find((w) => w.id === value)?.name ?? "Склад"}</span></SelectTrigger>
      <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function LeadSelect({ value, leads, onChange }: { value: string; leads: LeadOption[]; onChange: (value: string) => void }) {
  return (
    <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next ?? "")}>
      <SelectTrigger><span>{leads.find((lead) => lead.id === value)?.customer_data?.name ?? "Без замовлення"}</span></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Без замовлення</SelectItem>
        {leads.map((lead) => (
          <SelectItem key={lead.id} value={lead.id}>
            {lead.customer_data?.name ?? "Клієнт"} · {lead.status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, Search, Trash2 } from "lucide-react";
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
import { AdminTablePanel, AdminToolbar } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ErpMaterial, ErpMaterialKind, ErpMaterialType } from "@udo-craft/shared";

type MaterialWithType = ErpMaterial & { type?: ErpMaterialType | null };
type MaterialForm = Omit<ErpMaterial, "id"> & { id?: string };
type TypeForm = Omit<ErpMaterialType, "id"> & { id?: string };

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
  const [materials, setMaterials] = useState<MaterialWithType[]>([]);
  const [types, setTypes] = useState<ErpMaterialType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [materialsRes, typesRes] = await Promise.all([
        fetch("/api/erp/materials"),
        fetch("/api/erp/types"),
      ]);
      if (!materialsRes.ok) throw new Error("ERP tables are not ready");
      setMaterials(await materialsRes.json());
      setTypes(typesRes.ok ? await typesRes.json() : []);
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
          <div className="flex flex-col">
            <AdminToolbar>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-8 text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Пошук..."
                />
              </div>

              <span className="text-xs text-muted-foreground">{itemCountLabel}</span>

              <div className="ml-auto flex items-center gap-2">
                <Select value={typeFilter} onValueChange={(value) => value && setTypeFilter(value)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                  <span>{typeFilter === "all" ? "Всі типи" : typeFilter === "none" ? "Без типу" : types.find((c) => c.id === typeFilter)?.name ?? "Тип"}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всі типи</SelectItem>
                    <SelectItem value="none">Без типу</SelectItem>
                    {types.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </AdminToolbar>

            {loading ? (
              <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <AdminTablePanel className="m-4 md:m-6">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Номенклатура</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Собівартість</TableHead>
                    <TableHead className="text-right">Залишок</TableHead>
                    <TableHead className="text-right">Резерв</TableHead>
                    <TableHead className="text-right">Доступно</TableHead>
                    <TableHead className="text-right">Мін.</TableHead>
                    <TableHead>Постачальник</TableHead>
                    <TableHead className="w-32 text-right">Дії</TableHead>
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
                          <div className="text-xs text-muted-foreground">{m.sku || "Без SKU"} · {m.unit}</div>
                        </TableCell>
                        <TableCell>
                          {m.type ? (
                            <span className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.type.color }} />
                              {m.type.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{money(m.unit_cost_cents)} / {m.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={isLow ? "font-semibold text-amber-700" : ""}>{Number(m.stock_quantity).toLocaleString("uk-UA")} {m.unit}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(m.reserved_quantity).toLocaleString("uk-UA")} {m.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{available.toLocaleString("uk-UA")} {m.unit}</TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{Number(m.reorder_point).toLocaleString("uk-UA")} {m.unit}</TableCell>
                        <TableCell className="text-muted-foreground">{m.supplier || "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => edit(m)}>
                            Редагувати
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => remove(m)}>
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

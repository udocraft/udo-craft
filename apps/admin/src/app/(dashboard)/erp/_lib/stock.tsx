"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Edit3, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import type { ErpMaterial, ErpMaterialKind, ErpMaterialType } from "@udo-craft/shared";

export type MaterialWithType = ErpMaterial & { type?: ErpMaterialType | null };
export type MaterialForm = Omit<ErpMaterial, "id"> & { id?: string };
export type TypeForm = Omit<ErpMaterialType, "id"> & { id?: string };

export const KINDS: { value: ErpMaterialKind; label: string; unit: string }[] = [
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

export const EMPTY_FORM: MaterialForm = {
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

export const EMPTY_TYPE: TypeForm = {
  name: "",
  kind: "other",
  unit: "шт.",
  color: "#64748b",
  sort_order: 0,
  is_active: true,
};

export const money = (cents: number) => `${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UAH`;
export const kindLabel = (kind: string) => KINDS.find((k) => k.value === kind)?.label ?? kind;

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/** Shared fields for the create and edit pages of a stock item. */
export function MaterialFormFields({
  form,
  types,
  onFormChange,
}: {
  form: MaterialForm;
  types: ErpMaterialType[];
  onFormChange: (form: MaterialForm) => void;
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
  );
}

export function TypesDialog({
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

/** Loads stock items and types; `refetch` reloads both. */
export function useStockData() {
  const [materials, setMaterials] = useState<MaterialWithType[]>([]);
  const [types, setTypes] = useState<ErpMaterialType[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [materialsRes, typesRes] = await Promise.all([fetch("/api/erp/materials"), fetch("/api/erp/types")]);
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
    refetch();
  }, [refetch]);

  return { materials, types, loading, refetch };
}

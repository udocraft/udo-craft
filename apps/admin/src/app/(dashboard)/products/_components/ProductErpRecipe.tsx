"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ErpMaterial } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecipeLine = {
  id?: string;
  erp_material_id: string;
  role: string;
  quantity: number;
  waste_percent: number;
  production_step?: string | null;
  sort_order: number;
  material?: ErpMaterial;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "base",      label: "Основа" },
  { value: "print",     label: "Друк" },
  { value: "thread",    label: "Нитки" },
  { value: "hardware",  label: "Фурнітура" },
  { value: "labor",     label: "Робота" },
  { value: "packaging", label: "Пакування" },
  { value: "service",   label: "Послуга" },
];

const money = (cents: number) =>
  `${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`;

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductErpRecipe({ productId, onChange }: { productId: string; onChange?: () => void }) {
  const [materials, setMaterials] = useState<ErpMaterial[]>([]);
  const [lines, setLines] = useState<RecipeLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [materialsRes, recipeRes] = await Promise.all([
        fetch("/api/erp/materials"),
        fetch(`/api/erp/product-recipes/${productId}`),
      ]);
      const [materialsData, recipeData] = await Promise.all([
        materialsRes.ok ? materialsRes.json() : [],
        recipeRes.ok ? recipeRes.json() : [],
      ]);
      setMaterials(materialsData);
      setLines(recipeData);
    } catch {
      toast.error("Не вдалося завантажити ERP-склад");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const materialById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials]
  );

  const totalCostCents = useMemo(() =>
    lines.reduce((sum, line) => {
      const mat = line.material ?? materialById.get(line.erp_material_id);
      const unitCost = Number(mat?.unit_cost_cents ?? 0);
      const qty = Number(line.quantity || 0) * (1 + Number(line.waste_percent || 0) / 100);
      return sum + unitCost * qty;
    }, 0),
    [lines, materialById]
  );

  const updateLine = (index: number, patch: Partial<RecipeLine>) => {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
    onChange?.();
  };

  const addLine = () => {
    const first = materials[0];
    if (!first) { toast.info("Спочатку додайте матеріали на склад"); return; }
    setLines((prev) => [
      ...prev,
      { erp_material_id: first.id, role: "base", quantity: 1, waste_percent: 0, production_step: "", sort_order: prev.length, material: first },
    ]);
    onChange?.();
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index).map((l, i) => ({ ...l, sort_order: i })));
    onChange?.();
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/erp/product-recipes/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: lines.map((l, i) => ({ ...l, sort_order: i })) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Помилка збереження");
      toast.success("Калькуляцію збережено");
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Calculator className="mb-3 size-9 text-muted-foreground/30" />
        <p className="text-sm font-medium">Немає матеріалів</p>
        <p className="mt-1 text-xs text-muted-foreground">Додайте рядки для базової калькуляції продукту</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={addLine} disabled={materials.length === 0}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Додати матеріал
        </Button>
      </div>
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Header row with save button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{lines.length} позицій</p>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
          Зберегти
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[30%]">Матеріал</TableHead>
              <TableHead className="w-[110px]">Роль</TableHead>
              <TableHead className="w-[80px]">К-сть</TableHead>
              <TableHead className="w-[70px]">Відх. %</TableHead>
              <TableHead>Крок виробництва</TableHead>
              <TableHead className="text-right w-[110px]">Вартість</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const mat = line.material ?? materialById.get(line.erp_material_id);
              const qty = Number(line.quantity || 0) * (1 + Number(line.waste_percent || 0) / 100);
              const lineCost = Number(mat?.unit_cost_cents ?? 0) * qty;
              return (
                <TableRow key={line.id ?? index}>
                  {/* Material */}
                  <TableCell className="py-1.5">
                    <Select
                      value={line.erp_material_id}
                      onValueChange={(val) => {
                        if (!val) return;
                        updateLine(index, { erp_material_id: val, material: materialById.get(val) });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Матеріал" />
                      </SelectTrigger>
                      <SelectContent>
                        {materials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} · {money(m.unit_cost_cents)}/{m.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="py-1.5">
                    <Select
                      value={line.role || "base"}
                      onValueChange={(val) => updateLine(index, { role: val ?? "base" })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Quantity */}
                  <TableCell className="py-1.5">
                    <Input
                      type="number" min="0" step="0.001"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>

                  {/* Waste % */}
                  <TableCell className="py-1.5">
                    <Input
                      type="number" min="0" max="100" step="1"
                      value={line.waste_percent}
                      onChange={(e) => updateLine(index, { waste_percent: Number(e.target.value) })}
                      className="h-8 text-xs"
                    />
                  </TableCell>

                  {/* Production step */}
                  <TableCell className="py-1.5">
                    <Input
                      value={line.production_step ?? ""}
                      onChange={(e) => updateLine(index, { production_step: e.target.value || null })}
                      placeholder="Назва кроку"
                      className="h-8 text-xs"
                    />
                  </TableCell>

                  {/* Line cost */}
                  <TableCell className="py-1.5 text-right text-xs text-muted-foreground tabular-nums">
                    {money(Math.round(lineCost))}
                  </TableCell>

                  {/* Delete */}
                  <TableCell className="py-1.5">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="text-xs font-medium text-muted-foreground">
                Разом (матеріали)
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {money(Math.round(totalCostCents))}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={materials.length === 0}>
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Додати рядок
      </Button>
    </div>
  );
}

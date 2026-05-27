"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ErpMaterial } from "@udo-craft/shared";

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

const ROLE_OPTIONS = [
  { value: "base", label: "Основа" },
  { value: "print", label: "Друк" },
  { value: "thread", label: "Нитки" },
  { value: "hardware", label: "Фурнітура" },
  { value: "labor", label: "Робота" },
  { value: "packaging", label: "Пакування" },
  { value: "service", label: "Послуга" },
];

const money = (cents: number) => `${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UAH`;

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const estimatedCostCents = useMemo(() => {
    return lines.reduce((sum, line) => {
      const material = line.material ?? materialById.get(line.erp_material_id);
      const unitCost = Number(material?.unit_cost_cents ?? 0);
      const qtyWithWaste = Number(line.quantity || 0) * (1 + Number(line.waste_percent || 0) / 100);
      return sum + unitCost * qtyWithWaste;
    }, 0);
  }, [lines, materialById]);

  const updateLine = (index: number, patch: Partial<RecipeLine>) => {
    setLines((prev) => prev.map((line, i) => i === index ? { ...line, ...patch } : line));
    onChange?.();
  };

  const addLine = () => {
    const first = materials[0];
    if (!first) {
      toast.info("Спочатку додайте матеріали в ERP");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        erp_material_id: first.id,
        role: "base",
        quantity: 1,
        waste_percent: 0,
        production_step: "",
        sort_order: prev.length,
        material: first,
      },
    ]);
    onChange?.();
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
    onChange?.();
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/erp/product-recipes/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Помилка збереження");
      }
      setLines(await res.json());
      toast.success("ERP-склад товару збережено");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="font-medium">Орієнтовна собівартість: {money(Math.round(estimatedCostCents))}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4" />
            Додати
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Зберегти ERP
          </Button>
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Додайте тканину, фурнітуру, нитки, друк, пакування або час роботи, щоб товар мав розрахунок собівартості.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Матеріал / послуга</th>
                <th className="px-3 py-2 text-left font-medium">Роль</th>
                <th className="px-3 py-2 text-right font-medium">К-сть</th>
                <th className="px-3 py-2 text-right font-medium">Відхід %</th>
                <th className="px-3 py-2 text-left font-medium">Етап</th>
                <th className="px-3 py-2 text-right font-medium">Сума</th>
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const material = line.material ?? materialById.get(line.erp_material_id);
                const qtyWithWaste = Number(line.quantity || 0) * (1 + Number(line.waste_percent || 0) / 100);
                const lineCost = Math.round(Number(material?.unit_cost_cents ?? 0) * qtyWithWaste);
                return (
                  <tr key={line.id ?? index} className="border-t">
                    <td className="px-3 py-2">
                      <Select
                        value={line.erp_material_id || undefined}
                        onValueChange={(value) => {
                          if (!value) return;
                          updateLine(index, { erp_material_id: value, material: materialById.get(value) });
                        }}
                      >
                        <SelectTrigger>
                          <span className="truncate">{material?.name ?? "Оберіть матеріал"}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {materials.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} · {money(m.unit_cost_cents)}/{m.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={line.role || undefined} onValueChange={(value) => value && updateLine(index, { role: value })}>
                        <SelectTrigger>
                          <span>{ROLE_OPTIONS.find((role) => role.value === line.role)?.label ?? line.role}</span>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="text-right"
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="text-right"
                        type="number"
                        min="0"
                        step="0.1"
                        value={line.waste_percent}
                        onChange={(e) => updateLine(index, { waste_percent: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={line.production_step ?? ""}
                        onChange={(e) => updateLine(index, { production_step: e.target.value })}
                        placeholder="Крій, друк, пошиття..."
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{money(lineCost)}</td>
                    <td className="px-2 py-2">
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeLine(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border px-3 py-2">
          <Label className="text-xs text-muted-foreground">Матеріали</Label>
          <p className="text-lg font-semibold">{lines.length}</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <Label className="text-xs text-muted-foreground">Потрібно для 10 шт.</Label>
          <p className="text-lg font-semibold">{money(Math.round(estimatedCostCents * 10))}</p>
        </div>
        <div className="rounded-lg border px-3 py-2">
          <Label className="text-xs text-muted-foreground">Потрібно для 100 шт.</Label>
          <p className="text-lg font-semibold">{money(Math.round(estimatedCostCents * 100))}</p>
        </div>
      </div>
    </div>
  );
}

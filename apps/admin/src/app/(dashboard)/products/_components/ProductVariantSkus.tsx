"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Plus, Save, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { ErpMaterial, ProductColorVariant, ProductVariantSku } from "@udo-craft/shared";

type VariantSku = ProductVariantSku & {
  recipe?: Array<{ id?: string; erp_material_id: string; role: string; quantity: number; production_step?: string | null; material?: ErpMaterial }>;
};

const money = (cents: number) => `${(cents / 100).toLocaleString("uk-UA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UAH`;

export function ProductVariantSkus({ productId, sizes, onChange }: { productId: string; sizes: string[]; onChange?: () => void }) {
  const [skus, setSkus] = useState<VariantSku[]>([]);
  const [colors, setColors] = useState<ProductColorVariant[]>([]);
  const [materials, setMaterials] = useState<ErpMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    color_variant_id: "none",
    color_name: "",
    size: sizes[0] ?? "S",
    sku: "",
    sewing_cost_cents: 0,
    copy_from_variant_sku_id: "none",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [skusRes, colorsRes, materialsRes] = await Promise.all([
      fetch(`/api/erp/variant-skus?product_id=${productId}`),
      fetch(`/api/product-color-variants?product_id=${productId}`),
      fetch("/api/erp/materials"),
    ]);
    if (skusRes.ok) setSkus(await skusRes.json());
    if (colorsRes.ok) setColors(await colorsRes.json());
    if (materialsRes.ok) setMaterials(await materialsRes.json());
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const colorById = useMemo(() => new Map(colors.map((color) => [color.id, color])), [colors]);
  const materialById = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);

  const createSku = async () => {
    if (!form.size.trim()) {
      toast.error("Вкажіть розмір");
      return;
    }
    setSaving(true);
    try {
      const color = form.color_variant_id === "none" ? null : colorById.get(form.color_variant_id);
      const res = await fetch("/api/erp/variant-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          color_variant_id: color?.id ?? null,
          color_name: form.color_name || null,
          size: form.size,
          sku: form.sku || undefined,
          sewing_cost_cents: form.sewing_cost_cents,
          copy_from_variant_sku_id: form.copy_from_variant_sku_id === "none" ? null : form.copy_from_variant_sku_id,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Помилка створення SKU");
      toast.success("Варіацію створено");
      setForm((prev) => ({ ...prev, sku: "", copy_from_variant_sku_id: "none" }));
      fetchData();
      onChange?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Помилка створення SKU");
    } finally {
      setSaving(false);
    }
  };

  const saveRecipe = async (sku: VariantSku) => {
    const res = await fetch(`/api/erp/variant-skus/${sku.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe: sku.recipe ?? [], sewing_cost_cents: sku.sewing_cost_cents }),
    });
    if (!res.ok) {
      toast.error("Не вдалося зберегти калькуляцію варіації");
      return;
    }
    toast.success("Калькуляцію варіації збережено");
    fetchData();
    onChange?.();
  };

  const remove = async (sku: VariantSku) => {
    if (!confirm(`Видалити SKU ${sku.sku}?`)) return;
    const res = await fetch(`/api/erp/variant-skus/${sku.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("SKU видалено");
      fetchData();
    } else {
      toast.error("Не вдалося видалити SKU");
    }
  };

  if (loading) {
    return <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_120px_150px_170px_130px]">
        <Field label="Колір">
          <Select value={form.color_variant_id} onValueChange={(value) => setForm((prev) => ({ ...prev, color_variant_id: value ?? "none" }))}>
            <SelectTrigger><span>{form.color_variant_id === "none" ? "Без кольору" : form.color_name || "Колір"}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без кольору</SelectItem>
              {colors.map((color) => <SelectItem key={color.id} value={color.id}>{color.material_id}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Розмір">
          <Select value={form.size} onValueChange={(value) => setForm((prev) => ({ ...prev, size: value ?? prev.size }))}>
            <SelectTrigger><span>{form.size}</span></SelectTrigger>
            <SelectContent>{sizes.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Пошив, ₴">
          <Input type="number" min="0" step="1" value={form.sewing_cost_cents / 100} onChange={(e) => setForm((prev) => ({ ...prev, sewing_cost_cents: Math.round(Number(e.target.value) * 100) }))} />
        </Field>
        <Field label="Артикул">
          <Input value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="авто" />
        </Field>
        <Field label="Копія з">
          <Select value={form.copy_from_variant_sku_id} onValueChange={(value) => setForm((prev) => ({ ...prev, copy_from_variant_sku_id: value ?? "none" }))}>
            <SelectTrigger><span>{form.copy_from_variant_sku_id === "none" ? "Ні" : "Так"}</span></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не копіювати</SelectItem>
              {skus.map((sku) => <SelectItem key={sku.id} value={sku.id}>{sku.sku}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Button type="button" size="sm" onClick={createSku} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Створити варіацію
      </Button>

      {skus.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Створіть SKU для конкретного кольору і розміру. Артикул може згенеруватися автоматично.
        </div>
      ) : (
        <div className="space-y-3">
          {skus.map((sku, skuIndex) => {
            const recipe = sku.recipe ?? [];
            const recipeCost = recipe.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.material?.unit_cost_cents ?? materialById.get(line.erp_material_id)?.unit_cost_cents ?? 0), 0);
            return (
              <div key={sku.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Shirt className="h-4 w-4 text-primary" />
                  <span className="font-medium">{sku.sku}</span>
                  <span className="text-xs text-muted-foreground">розмір {sku.size}</span>
                  <span className="ml-auto text-sm font-medium">{money(Math.round(recipeCost + sku.sewing_cost_cents))}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => saveRecipe(sku)}><Save className="h-4 w-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(sku)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="mt-3 grid gap-2">
                  {recipe.map((line, lineIndex) => {
                    const material = line.material ?? materialById.get(line.erp_material_id);
                    return (
                      <div key={line.id ?? lineIndex} className="grid gap-2 md:grid-cols-[1fr_120px_1fr_36px]">
                        <Select value={line.erp_material_id} onValueChange={(value) => {
                          if (!value) return;
                          setSkus((prev) => prev.map((item, i) => i === skuIndex ? { ...item, recipe: recipe.map((r, j) => j === lineIndex ? { ...r, erp_material_id: value, material: materialById.get(value) } : r) } : item));
                        }}>
                          <SelectTrigger><span>{material?.name ?? "Матеріал"}</span></SelectTrigger>
                          <SelectContent>{materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {money(m.unit_cost_cents)}/{m.unit}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.001" value={line.quantity} onChange={(e) => setSkus((prev) => prev.map((item, i) => i === skuIndex ? { ...item, recipe: recipe.map((r, j) => j === lineIndex ? { ...r, quantity: Number(e.target.value) } : r) } : item))} />
                        <Input value={line.production_step ?? ""} onChange={(e) => setSkus((prev) => prev.map((item, i) => i === skuIndex ? { ...item, recipe: recipe.map((r, j) => j === lineIndex ? { ...r, production_step: e.target.value } : r) } : item))} placeholder="Етап" />
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => setSkus((prev) => prev.map((item, i) => i === skuIndex ? { ...item, recipe: recipe.filter((_, j) => j !== lineIndex) } : item))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    );
                  })}
                </div>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => {
                  const first = materials[0];
                  if (!first) return toast.info("Спочатку додайте матеріали на склад");
                  setSkus((prev) => prev.map((item, i) => i === skuIndex ? { ...item, recipe: [...(item.recipe ?? []), { erp_material_id: first.id, role: "material", quantity: 1, production_step: "", material: first }] } : item));
                }}>
                  <Copy className="h-4 w-4" />
                  Додати рядок калькуляції
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

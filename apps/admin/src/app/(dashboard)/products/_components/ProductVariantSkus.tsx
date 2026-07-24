"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Link2, Link2Off, Loader2, Plus, Save, Shirt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import type { ErpMaterial, ProductColorVariant, ProductVariantSku } from "@udo-craft/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

type RecipeLine = {
  id?: string;
  erp_material_id: string;
  role: string;
  quantity: number;
  production_step?: string | null;
  sort_order?: number;
  material?: ErpMaterial;
};

type VariantSku = ProductVariantSku & {
  color_variant?: ProductColorVariant & { material?: { name: string; hex_code?: string } } | null;
  recipe?: RecipeLine[];
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

// ── Helper: color name from variant ──────────────────────────────────────────

function colorName(sku: VariantSku, colors: ProductColorVariant[]): string {
  if (sku.color_variant?.material?.name) return sku.color_variant.material.name;
  const found = colors.find((c) => c.id === sku.color_variant_id);
  if (found) return (found as any).material?.name ?? found.material_id ?? "—";
  if (sku.color_name) return sku.color_name;
  return "Без кольору";
}

function colorHex(sku: VariantSku, colors: ProductColorVariant[]): string | undefined {
  if (sku.color_variant?.material?.hex_code) return sku.color_variant.material.hex_code;
  const found = colors.find((c) => c.id === sku.color_variant_id);
  return (found as any)?.material?.hex_code ?? (found as any)?.hex_code ?? undefined;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ── Recipe inline table ───────────────────────────────────────────────────────

function RecipeTable({
  sku,
  skuIndex,
  materials,
  materialById,
  onUpdateSku,
  onSave,
}: {
  sku: VariantSku;
  skuIndex: number;
  materials: ErpMaterial[];
  materialById: Map<string, ErpMaterial>;
  onUpdateSku: (index: number, patch: Partial<VariantSku>) => void;
  onSave: (sku: VariantSku) => void;
}) {
  const recipe = sku.recipe ?? [];

  const recipeCostCents = recipe.reduce((sum, line) => {
    const mat = line.material ?? materialById.get(line.erp_material_id);
    return sum + Number(line.quantity || 0) * Number(mat?.unit_cost_cents ?? 0);
  }, 0);

  const totalCostCents = Math.round(recipeCostCents + Number(sku.sewing_cost_cents ?? 0));

  const updateLine = (lineIndex: number, patch: Partial<RecipeLine>) => {
    const next = recipe.map((r, j) => j === lineIndex ? { ...r, ...patch } : r);
    onUpdateSku(skuIndex, { recipe: next });
  };

  const removeLine = (lineIndex: number) => {
    onUpdateSku(skuIndex, { recipe: recipe.filter((_, j) => j !== lineIndex) });
  };

  const addLine = () => {
    const first = materials[0];
    if (!first) { toast.info("Спочатку додайте матеріали на склад"); return; }
    onUpdateSku(skuIndex, {
      recipe: [...recipe, { erp_material_id: first.id, role: "base", quantity: 1, material: first }],
    });
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {/* Sewing cost row */}
      <div className="flex items-center gap-3">
        <Label className="text-xs text-muted-foreground w-28 shrink-0">Пошив (₴)</Label>
        <Input
          type="number" min="0" step="1" className="h-8 w-28 text-xs"
          value={sku.sewing_cost_cents / 100}
          onChange={(e) => onUpdateSku(skuIndex, { sewing_cost_cents: Math.round(Number(e.target.value) * 100) })}
        />
      </div>

      {/* Material recipe table */}
      {recipe.length > 0 ? (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs py-1.5 w-[35%]">Матеріал</TableHead>
                <TableHead className="text-xs py-1.5 w-[100px]">Роль</TableHead>
                <TableHead className="text-xs py-1.5 w-[70px]">К-сть</TableHead>
                <TableHead className="text-xs py-1.5">Крок</TableHead>
                <TableHead className="text-xs py-1.5 text-right w-[100px]">Вартість</TableHead>
                <TableHead className="w-[36px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipe.map((line, lineIndex) => {
                const mat = line.material ?? materialById.get(line.erp_material_id);
                const lineCost = Number(line.quantity || 0) * Number(mat?.unit_cost_cents ?? 0);
                return (
                  <TableRow key={line.id ?? lineIndex}>
                    <TableCell className="py-1">
                      <Select
                        value={line.erp_material_id}
                        onValueChange={(val) => {
                          if (!val) return;
                          updateLine(lineIndex, { erp_material_id: val, material: materialById.get(val) });
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs">
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
                    <TableCell className="py-1">
                      <Select
                        value={line.role || "base"}
                        onValueChange={(val) => updateLine(lineIndex, { role: val ?? "base" })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        type="number" min="0" step="0.001" className="h-7 text-xs"
                        value={line.quantity}
                        onChange={(e) => updateLine(lineIndex, { quantity: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        className="h-7 text-xs"
                        value={line.production_step ?? ""}
                        placeholder="Крок"
                        onChange={(e) => updateLine(lineIndex, { production_step: e.target.value || null })}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-right text-xs text-muted-foreground tabular-nums">
                      {money(Math.round(lineCost))}
                    </TableCell>
                    <TableCell className="py-1">
                      <button
                        type="button"
                        onClick={() => removeLine(lineIndex)}
                        className="flex size-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="text-xs text-muted-foreground py-1.5">
                  Матеріали + Пошив
                </TableCell>
                <TableCell className="text-right text-xs font-semibold tabular-nums py-1.5">
                  {money(totalCostCents)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">
          Немає рядків калькуляції. Загальна вартість = пошив: <strong>{money(Number(sku.sewing_cost_cents ?? 0))}</strong>
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addLine}>
          <Plus className="mr-1 size-3" /> Рядок
        </Button>
        <Button type="button" size="sm" className="h-7 text-xs" onClick={() => onSave(sku)}>
          <Save className="mr-1 size-3" /> Зберегти калькуляцію
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ProductVariantSkus({
  productId,
  sizes,
  onChange,
}: {
  productId: string;
  sizes: string[];
  onChange?: () => void;
}) {
  const [skus, setSkus] = useState<VariantSku[]>([]);
  const [colors, setColors] = useState<ProductColorVariant[]>([]);
  const [materials, setMaterials] = useState<ErpMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    color_variant_id: "none",
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

  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const updateSku = (index: number, patch: Partial<VariantSku>) => {
    setSkus((prev) => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  };

  // ── Create SKU ─────────────────────────────────────────────────────────

  const createSku = async () => {
    if (!form.size.trim()) { toast.error("Вкажіть розмір"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/erp/variant-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          color_variant_id: form.color_variant_id === "none" ? null : form.color_variant_id,
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка створення SKU");
    } finally {
      setSaving(false);
    }
  };

  // ── Save recipe ────────────────────────────────────────────────────────

  const saveRecipe = async (sku: VariantSku) => {
    const res = await fetch(`/api/erp/variant-skus/${sku.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe: (sku.recipe ?? []).map((l, i) => ({ ...l, sort_order: i })),
        sewing_cost_cents: sku.sewing_cost_cents,
      }),
    });
    if (!res.ok) { toast.error("Не вдалося зберегти калькуляцію"); return; }
    toast.success("Калькуляцію збережено");
    fetchData();
    onChange?.();
  };

  // ── Delete SKU ─────────────────────────────────────────────────────────

  const removeSku = async (sku: VariantSku) => {
    if (!confirm(`Видалити SKU ${sku.sku}?`)) return;
    const res = await fetch(`/api/erp/variant-skus/${sku.id}`, { method: "DELETE" });
    if (res.ok) { toast.success("SKU видалено"); fetchData(); onChange?.(); }
    else toast.error("Не вдалося видалити SKU");
  };

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-20 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Add form ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Нова варіація</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_120px_130px_110px]">
          {/* Color select with swatches */}
          <Field label="Колір">
            <Select
              value={form.color_variant_id}
              onValueChange={(v) => setForm((p) => ({ ...p, color_variant_id: v ?? "none" }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Без кольору">
                  {form.color_variant_id !== "none" && (() => {
                    const cv = colors.find((c) => c.id === form.color_variant_id);
                    const hex = (cv as any)?.material?.hex_code;
                    const name = (cv as any)?.material?.name ?? cv?.material_id ?? form.color_variant_id;
                    return (
                      <span className="flex items-center gap-2">
                        {hex && <span className="size-3 rounded-full border shrink-0" style={{ backgroundColor: hex }} />}
                        {name}
                      </span>
                    );
                  })()}
                  {form.color_variant_id === "none" && "Без кольору"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без кольору</SelectItem>
                {colors.map((c) => {
                  const hex = (c as any)?.material?.hex_code;
                  const name = (c as any)?.material?.name ?? c.material_id;
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        {hex && <span className="size-3 rounded-full border shrink-0" style={{ backgroundColor: hex }} />}
                        {name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          {/* Size */}
          <Field label="Розмір">
            <Select
              value={form.size}
              onValueChange={(v) => setForm((p) => ({ ...p, size: v ?? p.size }))}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sizes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          {/* Sewing cost */}
          <Field label="Пошив (₴)">
            <Input
              type="number" min="0" step="1" className="h-9"
              value={form.sewing_cost_cents / 100}
              onChange={(e) => setForm((p) => ({ ...p, sewing_cost_cents: Math.round(Number(e.target.value) * 100) }))}
            />
          </Field>

          {/* SKU */}
          <Field label="Артикул">
            <Input
              className="h-9"
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="авто"
            />
          </Field>

          {/* Copy from */}
          <Field label="Копіювати з">
            <Select
              value={form.copy_from_variant_sku_id}
              onValueChange={(v) => setForm((p) => ({ ...p, copy_from_variant_sku_id: v ?? "none" }))}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Ні" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не копіювати</SelectItem>
                {skus.map((s) => <SelectItem key={s.id} value={s.id}>{s.sku}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button type="button" size="sm" onClick={createSku} disabled={saving}>
          {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
          Створити варіацію
        </Button>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {skus.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Shirt className="mx-auto mb-2 size-8 opacity-25" />
          Створіть SKU для конкретного кольору та розміру. Артикул може згенеруватися автоматично.
        </div>
      )}

      {/* ── SKU list ──────────────────────────────────────────────────── */}
      {skus.length > 0 && (
        <div className="space-y-2">
          {skus.map((sku, skuIndex) => {
            const isOpen = expanded.has(sku.id);
            const hex = colorHex(sku, colors);
            const name = colorName(sku, colors);
            const isSynced = !!sku.color_variant_id;
            const recipe = sku.recipe ?? [];
            const recipeCostCents = recipe.reduce((sum, line) => {
              const mat = line.material ?? materialById.get(line.erp_material_id);
              return sum + Number(line.quantity || 0) * Number(mat?.unit_cost_cents ?? 0);
            }, 0);
            const totalCost = Math.round(recipeCostCents + Number(sku.sewing_cost_cents ?? 0));

            return (
              <div key={sku.id} className="rounded-lg border border-border bg-background">
                {/* SKU header row */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <Shirt className="size-4 shrink-0 text-muted-foreground" />

                  {/* Color swatch + name */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {hex && (
                      <span className="size-3 rounded-full border shrink-0" style={{ backgroundColor: hex }} />
                    )}
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>

                  {/* Size badge */}
                  <Badge variant="outline" className="shrink-0 text-xs font-mono">
                    {sku.size}
                  </Badge>

                  {/* SKU code */}
                  <span className="font-mono text-xs text-muted-foreground truncate hidden sm:block">{sku.sku}</span>

                  {/* Catalog sync badge */}
                  <span className="ml-auto shrink-0">
                    {isSynced ? (
                      <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 bg-green-50 gap-1">
                        <Link2 className="size-2.5" /> Каталог
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                        <Link2Off className="size-2.5" /> Не прив&apos;язано
                      </Badge>
                    )}
                  </span>

                  {/* Total cost */}
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{money(totalCost)}</span>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeSku(sku)}
                    className="shrink-0 flex size-7 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={() => toggleExpanded(sku.id)}
                    className="shrink-0 flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
                    aria-label={isOpen ? "Згорнути" : "Розгорнути"}
                  >
                    {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                </div>

                {/* Collapsible recipe section */}
                {isOpen && (
                  <div className="border-t border-border px-3 pb-3">
                    <RecipeTable
                      sku={sku}
                      skuIndex={skuIndex}
                      materials={materials}
                      materialById={materialById}
                      onUpdateSku={updateSku}
                      onSave={saveRecipe}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sync catalog names button */}
      {skus.some((s) => s.color_variant_id) && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={async () => {
              const res = await fetch("/api/erp/variant-skus/sync-catalog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product_id: productId }),
              });
              if (res.ok) {
                const { synced } = await res.json();
                toast.success(`Синхронізовано ${synced} назв кольорів з каталогу`);
                fetchData();
              } else {
                toast.error("Помилка синхронізації");
              }
            }}
          >
            <Copy className="mr-1.5 size-3" /> Синхронізувати назви з каталогу
          </Button>
        </div>
      )}
    </div>
  );
}

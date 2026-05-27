"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PRINT_TYPES = [
  { id: "dtf", label: "DTF" },
  { id: "embroidery", label: "Вишивка" },
  { id: "screen", label: "Шовкодрук" },
  { id: "sublimation", label: "Сублімація" },
  { id: "patch", label: "Нашивка" },
] as const;

interface QtyTier {
  min_qty: number;
  price_cents: number;
}

interface PricingRow {
  id: string;
  print_type: string;
  size_label: string;
  size_min_cm: number;
  size_max_cm: number;
  qty_tiers: QtyTier[];
  sort_order: number;
  is_active: boolean;
}

type PricingDraft = Omit<PricingRow, "id"> & { id?: string };

const createDraft = (printType: string, sortOrder: number): PricingDraft => ({
  print_type: printType,
  size_label: "",
  size_min_cm: 0,
  size_max_cm: 0,
  qty_tiers: [{ min_qty: 1, price_cents: 10000 }],
  sort_order: sortOrder,
  is_active: true,
});

function formatTiers(tiers: QtyTier[]) {
  return tiers
    .map((tier) => `${tier.min_qty} шт / ${(tier.price_cents / 100).toFixed(0)} ₴`)
    .join(", ");
}

function parseNumber(value: string, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function QtyTiersEditor({
  tiers,
  onChange,
}: {
  tiers: QtyTier[];
  onChange: (tiers: QtyTier[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_72px] gap-2 text-xs font-medium text-muted-foreground">
        <span>Від, шт</span>
        <span>Ціна, грн</span>
        <span className="sr-only">Дії</span>
      </div>

      {tiers.map((tier, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_72px] items-center gap-2">
          <Input
            min={1}
            type="number"
            value={tier.min_qty}
            onChange={(event) =>
              onChange(
                tiers.map((item, itemIndex) =>
                  itemIndex === index
                    ? { ...item, min_qty: Math.max(1, parseNumber(event.target.value, 1)) }
                    : item
                )
              )
            }
          />
          <Input
            min={0}
            type="number"
            value={Math.round(tier.price_cents / 100)}
            onChange={(event) =>
              onChange(
                tiers.map((item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        price_cents: Math.max(0, Math.round(parseNumber(event.target.value) * 100)),
                      }
                    : item
                )
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={tiers.length === 1}
            onClick={() => onChange(tiers.filter((_, itemIndex) => itemIndex !== index))}
          >
            Видалити
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...tiers, { min_qty: 1, price_cents: 10000 }])}
      >
        Додати тир
      </Button>
    </div>
  );
}

export default function PrintSizesTab({
  onCreateActionReady,
  showSectionAction = true,
}: {
  onCreateActionReady?: (handler: () => void) => void;
  showSectionAction?: boolean;
}) {
  const [activeType, setActiveType] = useState<(typeof PRINT_TYPES)[number]["id"]>("dtf");
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PricingDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingToggleId, setSavingToggleId] = useState<string | null>(null);

  const currentType = useMemo(
    () => PRINT_TYPES.find((type) => type.id === activeType) ?? PRINT_TYPES[0],
    [activeType]
  );

  const openCreate = useCallback(() => {
    setDraft(createDraft(activeType, rows.length));
  }, [activeType, rows.length]);

  useEffect(() => {
    onCreateActionReady?.(openCreate);
  }, [onCreateActionReady, openCreate]);

  const fetchRows = useCallback(async (type: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/print-type-pricing?print_type=${type}`);

      if (!response.ok) {
        throw new Error("Не вдалося завантажити сітку цін.");
      }

      const data = await response.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setRows([]);
      setError(fetchError instanceof Error ? fetchError.message : "Не вдалося завантажити сітку цін.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRows(activeType);
  }, [activeType, fetchRows]);

  const closeDialog = () => {
    if (!saving) {
      setDraft(null);
    }
  };

  const handleSave = async () => {
    if (!draft) return;

    if (!draft.size_label.trim()) {
      toast.error("Вкажіть назву розміру");
      return;
    }

    setSaving(true);

    const isEditing = Boolean(draft.id);
    const endpoint = isEditing ? `/api/print-type-pricing/${draft.id}` : "/api/print-type-pricing";

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error(isEditing ? "Помилка збереження" : "Помилка створення");
      }

      toast.success(isEditing ? "Збережено" : "Додано");
      setDraft(null);
      await fetchRows(activeType);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const response = await fetch(`/api/print-type-pricing/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Помилка видалення");
      }

      toast.success("Видалено");
      setDeleteTarget(null);
      await fetchRows(activeType);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Помилка видалення");
    }
  };

  const handleToggle = async (row: PricingRow) => {
    setSavingToggleId(row.id);

    try {
      const response = await fetch(`/api/print-type-pricing/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...row, is_active: !row.is_active }),
      });

      if (!response.ok) {
        throw new Error("Помилка оновлення статусу");
      }

      setRows((previousRows) =>
        previousRows.map((item) =>
          item.id === row.id ? { ...item, is_active: !item.is_active } : item
        )
      );
      toast.success(row.is_active ? "Деактивовано" : "Активовано");
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : "Помилка оновлення статусу");
    } finally {
      setSavingToggleId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminSection
        title="Розміри друку"
        description={`Сітка цін для ${currentType.label}`}
        actions={showSectionAction ? (
          <Button type="button" size="sm" onClick={openCreate}>
            Додати розмір
          </Button>
        ) : undefined}
      >
        <div className="mb-4 flex flex-wrap gap-1.5">
          {PRINT_TYPES.map((type) => (
            <Button
              key={type.id}
              type="button"
              variant={activeType === type.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveType(type.id)}
            >
              {type.label}
            </Button>
          ))}
        </div>

      {loading ? (
        <div className="flex min-h-44 items-center justify-center rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Завантаження сітки цін
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => fetchRows(activeType)}
          >
            Спробувати ще раз
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm font-medium text-foreground">Немає записів для цього типу</p>
          <p className="mt-1 text-xs text-muted-foreground">Додайте перший розмір і тири цін.</p>
          <Button
            type="button"
            size="sm"
            className="mt-4"
            onClick={() => setDraft(createDraft(activeType, 0))}
          >
            Додати розмір
          </Button>
        </div>
      ) : (
        <AdminTablePanel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-24">Статус</TableHead>
              <TableHead>Розмір</TableHead>
              <TableHead className="text-right">Мін., см</TableHead>
              <TableHead className="text-right">Макс., см</TableHead>
              <TableHead>Тири кількості</TableHead>
              <TableHead className="w-32 text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Switch
                    checked={row.is_active}
                    disabled={savingToggleId === row.id}
                    onCheckedChange={() => handleToggle(row)}
                  />
                </TableCell>
                <TableCell className="font-medium">{row.size_label}</TableCell>
                <TableCell className="text-right tabular-nums">{row.size_min_cm}</TableCell>
                <TableCell className="text-right tabular-nums">{row.size_max_cm}</TableCell>
                <TableCell className="max-w-[360px] truncate text-muted-foreground">
                  {formatTiers(row.qty_tiers)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft({ ...row })}>
                      Редагувати
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(row)}
                    >
                      Видалити
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </AdminTablePanel>
      )}
      </AdminSection>

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Редагувати розмір" : "Додати розмір"}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="size-label">Назва</Label>
                  <Input
                    id="size-label"
                    value={draft.size_label}
                    onChange={(event) => setDraft({ ...draft, size_label: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size-min">Мін., см</Label>
                  <Input
                    id="size-min"
                    type="number"
                    value={draft.size_min_cm}
                    onChange={(event) =>
                      setDraft({ ...draft, size_min_cm: parseNumber(event.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size-max">Макс., см</Label>
                  <Input
                    id="size-max"
                    type="number"
                    value={draft.size_max_cm}
                    onChange={(event) =>
                      setDraft({ ...draft, size_max_cm: parseNumber(event.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Тири кількості</Label>
                <QtyTiersEditor
                  tiers={draft.qty_tiers}
                  onChange={(tiers) => setDraft({ ...draft, qty_tiers: tiers })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
              Скасувати
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити розмір?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.size_label} буде видалено з сітки цін без можливості відновлення.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

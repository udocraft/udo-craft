"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

import { AdminEmptyState, AdminTablePanel, AdminTableSkeletonRows } from "@/components/admin-layout";
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
        Додати поріг
      </Button>
    </div>
  );
}

/** Price grid for one print type: sizes (cm range) with quantity tiers. */
export default function PriceGrid({
  printType,
  printTypeLabel,
  onCreateActionReady,
}: {
  printType: string;
  printTypeLabel: string;
  onCreateActionReady?: (handler: () => void) => void;
}) {
  const activeType = printType;
  const [rows, setRows] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PricingDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PricingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingToggleId, setSavingToggleId] = useState<string | null>(null);

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
    if (draft.size_max_cm > 0 && draft.size_min_cm > draft.size_max_cm) {
      toast.error("Мінімальний розмір більший за максимальний");
      return;
    }
    const qtys = draft.qty_tiers.map((t) => t.min_qty);
    if (new Set(qtys).size !== qtys.length) {
      toast.error("Кількості в тирах повторюються");
      return;
    }
    if (!qtys.includes(1)) {
      toast.error("Перший тир має починатися з 1 шт");
      return;
    }

    setSaving(true);

    const isEditing = Boolean(draft.id);
    const endpoint = isEditing ? `/api/print-type-pricing/${draft.id}` : "/api/print-type-pricing";

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          size_label: draft.size_label.trim(),
          qty_tiers: [...draft.qty_tiers].sort((x, y) => x.min_qty - y.min_qty),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || (isEditing ? "Помилка збереження" : "Помилка створення"));
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
        body: JSON.stringify({ is_active: !row.is_active }),
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

  const COLS = 6;

  return (
    <div className="px-4 pb-6 md:px-6">
      {error ? (
        <AdminEmptyState
          title="Не вдалося завантажити ціни"
          description={error}
          action={<Button type="button" variant="outline" size="sm" onClick={() => fetchRows(activeType)}>Спробувати ще раз</Button>}
        />
      ) : (
        <AdminTablePanel bleed>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Розмір</TableHead>
                <TableHead className="text-right">Від, см</TableHead>
                <TableHead className="text-right">До, см</TableHead>
                <TableHead>Ціна за кількість</TableHead>
                <TableHead className="w-24">Активна</TableHead>
                <TableHead className="w-12"><span className="sr-only">Дії</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <AdminTableSkeletonRows rows={5} cols={COLS} />
              ) : rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={COLS}>
                    <AdminEmptyState
                      title={`Цін для «${printTypeLabel}» ще немає`}
                      description="Додайте розмір і ціни за кількість — вони з'являться в конструкторі."
                      action={<Button type="button" size="sm" onClick={() => setDraft(createDraft(activeType, 0))}><Plus className="size-4" />Додати ціну</Button>}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className={!row.is_active ? "text-muted-foreground" : undefined}>
                    <TableCell>
                      <button type="button" onClick={() => setDraft({ ...row })} className="rounded text-left font-medium hover:text-primary">
                        {row.size_label}
                      </button>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.size_min_cm}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.size_max_cm}</TableCell>
                    <TableCell className="max-w-[420px]">
                      <div className="flex flex-wrap gap-1.5">
                        {[...row.qty_tiers].sort((x, y) => x.min_qty - y.min_qty).map((t) => (
                          <span key={t.min_qty} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums">
                            <span className="text-muted-foreground">від {t.min_qty} шт</span>
                            <span className="font-medium text-foreground">{Math.round(t.price_cents / 100)} ₴</span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={row.is_active}
                        disabled={savingToggleId === row.id}
                        onCheckedChange={() => handleToggle(row)}
                        aria-label={`Активна ціна ${row.size_label}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Дії для ${row.size_label}`}
                          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem onClick={() => setDraft({ ...row })}><Pencil className="size-4" />Редагувати</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteTarget(row)}>
                            <Trash2 className="size-4" />Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Редагувати ціну" : `Нова ціна · ${printTypeLabel}`}</DialogTitle>
          </DialogHeader>

          {draft && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="size-label">Назва розміру</Label>
                  <Input
                    id="size-label"
                    value={draft.size_label}
                    onChange={(event) => setDraft({ ...draft, size_label: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="size-min">Від, см</Label>
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
                  <Label htmlFor="size-max">До, см</Label>
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
                <Label>Ціна за кількість</Label>
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
            <AlertDialogTitle>Видалити ціну?</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.size_label}» зникне з конструктора. Це не можна скасувати.
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

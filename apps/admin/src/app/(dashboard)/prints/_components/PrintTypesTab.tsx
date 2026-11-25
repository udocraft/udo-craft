"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminEmptyState, AdminTablePanel, AdminTableSkeletonRows } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrintTypes, type PrintTypeRow } from "@/hooks/use-print-types";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = ["#6366f1", "#ec4899", "#f59e0b", "#06b6d4", "#10b981", "#ef4444", "#8b5cf6", "#0f172a"];

type Draft = { id: string; label: string; description: string; color: string; is_active: boolean; isNew: boolean };

const emptyDraft = (): Draft => ({ id: "", label: "", description: "", color: COLOR_PRESETS[0], is_active: true, isNew: true });

/** Latin slug for the code field, suggested from the name (Ukrainian letters transliterated). */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch",
  ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", "'": "",
};
function slugify(label: string) {
  return label.toLowerCase().split("").map((c) => TRANSLIT[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function PrintTypesTab({ onCreateActionReady }: { onCreateActionReady?: (handler: () => void) => void }) {
  const { types, setTypes, loading, error, reload } = usePrintTypes();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [codeTouched, setCodeTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PrintTypeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    onCreateActionReady?.(() => { setCodeTouched(false); setDraft(emptyDraft()); });
  }, [onCreateActionReady]);

  const save = async () => {
    if (!draft) return;
    if (!draft.label.trim()) { toast.error("Вкажіть назву"); return; }
    setSaving(true);
    try {
      const res = await fetch(draft.isNew ? "/api/print-types" : `/api/print-types/${draft.id}`, {
        method: draft.isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(draft.isNew ? { id: draft.id || slugify(draft.label), sort_order: (types.at(-1)?.sort_order ?? 0) + 10 } : {}),
          label: draft.label, description: draft.description, color: draft.color, is_active: draft.is_active,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не вдалося зберегти");
      toast.success(draft.isNew ? "Тип друку додано" : "Збережено");
      setDraft(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (type: PrintTypeRow) => {
    setToggling(type.id);
    setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, is_active: !t.is_active } : t)));
    try {
      const res = await fetch(`/api/print-types/${type.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !type.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(type.is_active ? `«${type.label}» приховано з конструктора` : `«${type.label}» показано в конструкторі`);
    } catch {
      setTypes((prev) => prev.map((t) => (t.id === type.id ? { ...t, is_active: type.is_active } : t)));
      toast.error("Не вдалося змінити статус");
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/print-types/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не вдалося видалити");
      toast.success("Тип друку видалено");
      setDeleteTarget(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося видалити");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 pb-6 md:px-6">
      {error ? (
        <AdminEmptyState
          title="Не вдалося завантажити типи друку"
          description={error}
          action={<Button size="sm" variant="outline" onClick={reload}>Спробувати ще раз</Button>}
        />
      ) : (
        <AdminTablePanel bleed>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Назва</TableHead>
                <TableHead className="hidden md:table-cell">Код</TableHead>
                <TableHead className="hidden lg:table-cell">Опис</TableHead>
                <TableHead className="text-right">Ціни</TableHead>
                <TableHead className="w-28">У конструкторі</TableHead>
                <TableHead className="w-12"><span className="sr-only">Дії</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && types.length === 0 ? (
                <AdminTableSkeletonRows rows={5} cols={6} />
              ) : types.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6}>
                    <AdminEmptyState
                      title="Типів друку ще немає"
                      description="Додайте перший тип, щоб задати для нього ціни."
                      action={<Button size="sm" onClick={() => { setCodeTouched(false); setDraft(emptyDraft()); }}><Plus className="size-4" />Додати тип</Button>}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type) => (
                  <TableRow key={type.id} className={cn(!type.is_active && "text-muted-foreground")}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => { setCodeTouched(true); setDraft({ ...type, isNew: false }); }}
                        className="flex items-center gap-2.5 rounded text-left font-medium hover:text-primary"
                      >
                        <span className="size-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: type.color }} aria-hidden="true" />
                        {type.label}
                      </button>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{type.id}</TableCell>
                    <TableCell className="hidden max-w-[320px] truncate text-muted-foreground lg:table-cell">{type.description || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Link href={`/prices?type=${type.id}`} className="text-primary hover:underline">
                        {type.price_count}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={type.is_active}
                        disabled={toggling === type.id}
                        onCheckedChange={() => toggle(type)}
                        aria-label={`Показувати «${type.label}» у конструкторі`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Дії для «${type.label}»`}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuItem onClick={() => { setCodeTouched(true); setDraft({ ...type, isNew: false }); }}>
                            <Pencil className="size-4" />Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuItem render={<Link href={`/prices?type=${type.id}`} />}>
                            Ціни ({type.price_count})
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onClick={() => setDeleteTarget(type)}
                          >
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

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && !saving && setDraft(null)}>
        <DialogContent maxWidth="md">
          <DialogHeader>
            <DialogTitle>{draft?.isNew ? "Новий тип друку" : "Редагувати тип друку"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              id="print-type-form"
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); void save(); }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="pt-label">Назва</Label>
                <Input
                  id="pt-label"
                  autoFocus
                  required
                  maxLength={60}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value, ...(draft.isNew && !codeTouched ? { id: slugify(e.target.value) } : {}) })}
                  placeholder="Напр. Термотрансфер"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-code">Код</Label>
                <Input
                  id="pt-code"
                  value={draft.id}
                  disabled={!draft.isNew}
                  onChange={(e) => { setCodeTouched(true); setDraft({ ...draft, id: e.target.value.toLowerCase() }); }}
                  className="font-mono"
                  placeholder="thermo-transfer"
                  aria-describedby="pt-code-hint"
                />
                <p id="pt-code-hint" className="text-xs text-muted-foreground">
                  {draft.isNew ? "Латиниця, цифри, - або _. Після створення змінити не можна." : "Код зберігається в замовленнях, тому не змінюється."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-desc">Опис</Label>
                <Input id="pt-desc" maxLength={200} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Коротко для менеджерів" />
              </div>
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Колір мітки</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setDraft({ ...draft, color: c })}
                      aria-label={`Колір ${c}`}
                      aria-pressed={draft.color.toLowerCase() === c}
                      className={cn("size-8 rounded-full ring-offset-2 transition", draft.color.toLowerCase() === c ? "ring-2 ring-foreground" : "ring-1 ring-black/10 hover:scale-105")}
                      style={{ background: c }}
                    />
                  ))}
                  <label className="relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10" title="Свій колір">
                    <span className="sr-only">Свій колір</span>
                    <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                    <Plus className="size-4 text-muted-foreground" />
                  </label>
                </div>
              </fieldset>
              <label className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">Показувати в конструкторі</span>
                  <span className="block text-xs text-muted-foreground">Клієнти зможуть обрати цей тип друку</span>
                </span>
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              </label>
            </form>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={saving}>Скасувати</Button>
            <Button type="submit" form="print-type-form" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {draft?.isNew ? "Додати" : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити «{deleteTarget?.label}»?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.price_count > 0
                ? `Цей тип має ${deleteTarget.price_count} цін, тому його не можна видалити. Приховайте його вимикачем «У конструкторі» або спершу видаліть ціни.`
                : "Тип зникне зі списку. Це не можна скасувати."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            {deleteTarget && deleteTarget.price_count === 0 && (
              <AlertDialogAction onClick={remove} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting && <Loader2 className="size-4 animate-spin" />}Видалити
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

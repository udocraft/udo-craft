"use client";

import * as React from "react";
import { Download, FileText, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Word the user types to confirm a bulk delete (case-insensitive, surrounding spaces ignored). */
export const DELETE_CONFIRM_WORD = "delete";

/** Row selection for a table: ids of visible rows + toggle helpers. Drops ids that left the list. */
export function useRowSelection(visibleIds: string[]) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const key = visibleIds.join(",");

  React.useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  return {
    selected,
    count: selected.size,
    allSelected,
    someSelected,
    isSelected: (id: string) => selected.has(id),
    toggle: (id: string) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }),
    toggleAll: () => setSelected(allSelected ? new Set() : new Set(visibleIds)),
    clear: () => setSelected(new Set()),
  };
}

/** Floating bar shown while rows are selected: count, export CSV/PDF, delete, clear. */
export function BulkActionBar({
  count,
  noun,
  onClear,
  onExportCsv,
  onExportPdf,
  onDelete,
}: {
  count: number;
  /** e.g. (n) => `${n} замовлень` */
  noun: (n: number) => string;
  onClear: () => void;
  onExportCsv: () => void;
  onExportPdf: () => Promise<void> | void;
  onDelete?: () => void;
}) {
  const [pdfBusy, setPdfBusy] = React.useState(false);
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Дії з вибраними"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-0.5 rounded-xl border border-border bg-background p-1.5 pl-3 shadow-lg animate-in fade-in slide-in-from-bottom-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:gap-1 sm:pl-4 md:left-[calc(50%+var(--sidebar-width,0px)/2)]"
    >
      <span className="mr-auto min-w-0 truncate whitespace-nowrap text-sm font-medium tabular-nums sm:mr-2" aria-live="polite">
        <span className="hidden sm:inline">Вибрано </span>{noun(count)}
      </span>
      <Button variant="ghost" size="sm" onClick={onExportCsv} className="gap-1.5 px-2.5 sm:px-3" aria-label="Експорт у CSV">
        <Download className="size-4" /><span className="hidden sm:inline">CSV</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2.5 sm:px-3"
        aria-label="Експорт у PDF"
        disabled={pdfBusy}
        onClick={async () => { setPdfBusy(true); try { await onExportPdf(); } finally { setPdfBusy(false); } }}
      >
        {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}<span className="hidden sm:inline">PDF</span>
      </Button>
      {onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Видалити вибрані" className="gap-1.5 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:px-3">
          <Trash2 className="size-4" /><span className="hidden sm:inline">Видалити</span>
        </Button>
      )}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Зняти вибір">
        <X className="size-4" />
      </Button>
    </div>
  );
}

/** Delete confirmation that unlocks only after typing DELETE_CONFIRM_WORD. */
export function TypedDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const ok = text.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  React.useEffect(() => { if (!open) setText(""); }, [open]);

  const confirm = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); void confirm(); }} className="space-y-2">
          <label htmlFor="typed-delete" className="text-sm">
            Щоб підтвердити, введіть <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{DELETE_CONFIRM_WORD}</span>
          </label>
          <Input
            id="typed-delete"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            autoFocus
            spellCheck={false}
            aria-invalid={text.length > 0 && !ok ? true : undefined}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Скасувати</AlertDialogCancel>
          <Button variant="destructive" disabled={!ok || busy} onClick={confirm}>
            {busy && <Loader2 className="size-4 animate-spin" />}Видалити назавжди
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

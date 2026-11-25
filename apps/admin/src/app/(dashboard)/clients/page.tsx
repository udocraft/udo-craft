"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar, TypedDeleteDialog, useRowSelection } from "@/components/bulk-actions";
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/export";
import { EmptyState } from "@/components/empty-state";
import { AdminFilter, AdminFilterReset, AdminSearch, AdminSort, AdminTablePanel, AdminTableSkeletonRows, AdminToolbar } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { fmtDate, fmtMoney } from "@/lib/utils";
import { clientHref, useClients } from "./_lib/clients";

type SourceFilter = "all" | "keycrm" | "manual";
type SortFilter = "spent" | "recent" | "orders";

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, loading, reload } = useClients();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("spent");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const initial = searchParams.get("search");
    if (initial) setSearch(initial);
  }, [searchParams]);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/keycrm/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pages: 2 }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`KeyCRM: ${data.created ?? 0} нових, ${data.updated ?? 0} оновлено`);
      await reload();
    } catch (error) {
      toast.error(`KeyCRM sync failed: ${error instanceof Error ? error.message : "невідома помилка"}`);
    } finally {
      setSyncing(false);
    }
  }, [reload]);

  const q = search.toLowerCase();
  const filtered = clients
    .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(search) || (c.company ?? "").toLowerCase().includes(q))
    .filter((c) => (sourceFilter === "all" ? true : sourceFilter === "keycrm" ? c.keycrmOrders > 0 : c.keycrmOrders === 0))
    .sort((a, b) => (sortFilter === "recent" ? b.lastOrderAt.localeCompare(a.lastOrderAt) : sortFilter === "orders" ? b.ordersCount - a.ordersCount : b.totalSpent - a.totalSpent));

  // ── Bulk actions ─────────────────────────────────────────────────────
  const selection = useRowSelection(filtered.map((c) => c.key));
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectedClients = filtered.filter((c) => selection.isSelected(c.key));
  const selectedOrderIds = selectedClients.flatMap((c) => c.leads.map((l) => l.id));
  const clientsNoun = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? "клієнта" : "клієнтів"}`;
  const exportColumns: ExportColumn<(typeof filtered)[number]>[] = [
    { header: "Клієнт", value: (c) => c.name },
    { header: "Email", value: (c) => c.email },
    { header: "Телефон", value: (c) => c.phone ?? "" },
    { header: "Компанія", value: (c) => c.company ?? "" },
    { header: "Джерело", value: (c) => (c.keycrmOrders > 0 ? "KeyCRM" : "Вручну") },
    { header: "Замовлень", value: (c) => c.ordersCount },
    { header: "Сума, ₴", value: (c) => (c.totalSpent / 100).toFixed(2) },
    { header: "Оплачено, ₴", value: (c) => (c.paidTotal / 100).toFixed(2) },
    { header: "Останнє замовлення", value: (c) => new Date(c.lastOrderAt).toLocaleDateString("uk-UA") },
  ];
  const bulkDelete = async () => {
    try {
      // Clients are grouped orders, so deleting a client deletes all of their orders.
      for (let i = 0; i < selectedOrderIds.length; i += 500) {
        const res = await fetch("/api/leads/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedOrderIds.slice(i, i + 500) }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast.success(`Видалено ${clientsNoun(selectedClients.length)}`);
      selection.clear();
      await reload();
    } catch (e) {
      toast.error(`Не вдалося видалити: ${e instanceof Error ? e.message : "помилка"}`);
      throw e;
    }
  };

  return (
    <ListPage
      title="Клієнти"
      createHref="/clients/new"
      createLabel="Додати клієнта"
      actions={
        <Button variant="outline" size="sm" className="gap-2" onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Sync KeyCRM
        </Button>
      }
      filters={
        <AdminToolbar>
          <AdminSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ім'я, email, телефон…" />
          <AdminFilter
            label="Джерело"
            active={sourceFilter !== "all"}
            value={sourceFilter === "all" ? undefined : sourceFilter}
            options={[{ value: "keycrm", label: "KeyCRM" }, { value: "manual", label: "Додані вручну" }]}
            onSelect={(v) => setSourceFilter(v as SourceFilter)}
            onClear={() => setSourceFilter("all")}
          />
          <AdminFilterReset active={sourceFilter !== "all" || search.trim() !== ""} onReset={() => { setSourceFilter("all"); setSearch(""); }} />
          <div className="flex w-full items-center justify-between gap-3 sm:ml-auto sm:w-auto">
            <span className="text-sm text-muted-foreground tabular-nums">{loading ? "" : `${filtered.length} клієнтів`}</span>
            <AdminSort
              value={sortFilter}
              options={[{ value: "spent", label: "За сумою" }, { value: "recent", label: "Останні" }, { value: "orders", label: "За кількістю" }]}
              onChange={(v) => setSortFilter(v as SortFilter)}
            />
          </div>
        </AdminToolbar>
      }
    >
      {loading ? (
        <AdminTablePanel bleed>
          <Table>
            <TableBody>
              <AdminTableSkeletonRows rows={8} cols={7} />
            </TableBody>
          </Table>
        </AdminTablePanel>
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState icon={Search} title="Нічого не знайдено" description="Спробуйте змінити запит пошуку" action={<Button variant="outline" size="sm" onClick={() => setSearch("")}>Скинути пошук</Button>} />
        ) : (
          <EmptyState icon={Users} title="Клієнтів ще немає" description="Додайте першого клієнта вручну або він з'явиться після першого замовлення" />
        )
      ) : (
        <AdminTablePanel bleed>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Вибрати всіх клієнтів"
                    checked={selection.allSelected}
                    indeterminate={selection.someSelected}
                    onCheckedChange={() => selection.toggleAll()}
                  />
                </TableHead>
                <TableHead>Клієнт</TableHead>
                <TableHead className="hidden md:table-cell">Джерело</TableHead>
                <TableHead className="hidden sm:table-cell">Замовлень</TableHead>
                <TableHead className="text-right sm:text-left">Сума</TableHead>
                <TableHead className="hidden lg:table-cell">Оплачено</TableHead>
                <TableHead className="hidden sm:table-cell">Останнє замовлення</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.key}
                  className="cursor-pointer"
                  data-state={selection.isSelected(c.key) ? "selected" : undefined}
                  onClick={() => router.push(clientHref(c.key))}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Вибрати ${c.name}`}
                      checked={selection.isSelected(c.key)}
                      onCheckedChange={() => selection.toggle(c.key)}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email || c.phone || "Без контактів"}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={c.keycrmOrders > 0 ? "info" : "outline"} className="h-5 text-[10px] normal-case tracking-normal">{c.keycrmOrders > 0 ? "KeyCRM" : "Вручну"}</Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm tabular-nums sm:table-cell">{c.ordersCount}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums sm:text-left">{fmtMoney(c.totalSpent)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground tabular-nums lg:table-cell">{fmtMoney(c.paidTotal)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{fmtDate(c.lastOrderAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
      <BulkActionBar
        count={selection.count}
        noun={clientsNoun}
        onClear={selection.clear}
        onExportCsv={() => exportCsv("clients", exportColumns, selectedClients)}
        onExportPdf={() => exportPdf("clients", "Клієнти", exportColumns, selectedClients)}
        onDelete={() => setBulkDeleteOpen(true)}
      />
      <TypedDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Видалити ${clientsNoun(selection.count)}?`}
        description={`Клієнт у системі — це його замовлення. Буде видалено назавжди ${selectedOrderIds.length} замовлень разом з позиціями та листуванням. Скасувати це не можна.`}
        onConfirm={bulkDelete}
      />
    </ListPage>
  );
}

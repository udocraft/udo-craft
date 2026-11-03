"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AdminFilter, AdminSearch, AdminTablePanel, AdminToolbar } from "@/components/admin-layout";
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
          <AdminSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Швидкий пошук..." />
          <AdminFilter
            label="Джерело"
            active={sourceFilter !== "all"}
            value={sourceFilter === "all" ? undefined : sourceFilter}
            options={[{ value: "all", label: "Всі джерела" }, { value: "keycrm", label: "KeyCRM" }, { value: "manual", label: "Вручну" }]}
            onSelect={(v) => setSourceFilter(v as SourceFilter)}
            onClear={() => setSourceFilter("all")}
          />
          <AdminFilter
            label="Сортування"
            active={sortFilter !== "spent"}
            value={sortFilter === "spent" ? undefined : sortFilter}
            options={[{ value: "spent", label: "За сумою" }, { value: "recent", label: "Останні" }, { value: "orders", label: "За кількістю" }]}
            onSelect={(v) => setSortFilter(v as SortFilter)}
            onClear={() => setSortFilter("spent")}
          />
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{filtered.length} клієнтів</span>
        </AdminToolbar>
      }
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState icon={Search} title="Нічого не знайдено" description="Спробуйте змінити запит пошуку" action={<Button variant="outline" size="sm" onClick={() => setSearch("")}>Скинути пошук</Button>} />
        ) : (
          <EmptyState icon={Users} title="Клієнтів ще немає" description="Додайте першого клієнта вручну або він з'явиться після першого замовлення" />
        )
      ) : (
        <AdminTablePanel>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Клієнт</TableHead>
                <TableHead>Джерело</TableHead>
                <TableHead>Замовлень</TableHead>
                <TableHead>Загальна сума</TableHead>
                <TableHead>Оплачено</TableHead>
                <TableHead>Останнє замовлення</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.key} className="cursor-pointer" onClick={() => router.push(clientHref(c.key))}>
                  <TableCell>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.email || c.phone || "Без контактів"}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.keycrmOrders > 0 ? "info" : "outline"} className="h-5 text-[10px] normal-case tracking-normal">{c.keycrmOrders > 0 ? "KeyCRM" : "Вручну"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{c.ordersCount}</TableCell>
                  <TableCell className="text-xs font-medium">{fmtMoney(c.totalSpent)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtMoney(c.paidTotal)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(c.lastOrderAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </ListPage>
  );
}

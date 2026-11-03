"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminFilter, AdminSearch, AdminTablePanel, AdminToolbar } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { money, TypesDialog, useStockData } from "../_lib/stock";

export default function StockListPage() {
  const router = useRouter();
  const { materials, types, loading, refetch } = useStockData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [typesOpen, setTypesOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return materials.filter((m) => {
      const matchesType = typeFilter === "all" || (typeFilter === "none" ? !m.type_id : m.type_id === typeFilter);
      const matchesQuery = !needle || [m.name, m.sku, m.kind, m.supplier, m.type?.name].some((v) => String(v ?? "").toLowerCase().includes(needle));
      return matchesType && matchesQuery;
    });
  }, [materials, query, typeFilter]);

  const count = `${filtered.length} ${filtered.length === 1 ? "позиція" : filtered.length > 1 && filtered.length < 5 ? "позиції" : "позицій"}`;

  return (
    <ListPage
      title="Склад"
      subtitle="Залишки матеріалів і готових основ"
      createHref="/erp/stock/new"
      createLabel="Нова позиція"
      actions={<Button variant="outline" size="sm" onClick={() => setTypesOpen(true)}>Типи</Button>}
      filters={
        <AdminToolbar>
          <AdminSearch value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Швидкий пошук..." />
          <AdminFilter
            label="Тип"
            active={typeFilter !== "all"}
            value={typeFilter === "all" ? undefined : typeFilter === "none" ? "Без типу" : types.find((t) => t.id === typeFilter)?.name}
            onClear={() => setTypeFilter("all")}
            icon={Tag}
            onClick={() => document.getElementById("type-filter-trigger")?.click()}
          />
          <Select value={typeFilter} onValueChange={(value) => value && setTypeFilter(value)}>
            <SelectTrigger className="sr-only h-0 w-0 p-0" id="type-filter-trigger"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі типи</SelectItem>
              <SelectItem value="none">Без типу</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{count}</span>
        </AdminToolbar>
      }
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <AdminTablePanel>
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-11">Номенклатура</TableHead>
                <TableHead className="h-11">Тип</TableHead>
                <TableHead className="h-11 text-right">Собівартість</TableHead>
                <TableHead className="h-11 text-right">Залишок</TableHead>
                <TableHead className="h-11 text-right">Резерв</TableHead>
                <TableHead className="h-11 text-right">Доступно</TableHead>
                <TableHead className="h-11">Постачальник</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-14 text-center text-sm text-muted-foreground">Позицій не знайдено</TableCell>
                </TableRow>
              )}
              {filtered.map((m) => {
                const stock = Number(m.stock_quantity || 0);
                const reserved = Number(m.reserved_quantity || 0);
                const isLow = Number(m.reorder_point || 0) > 0 && stock <= Number(m.reorder_point || 0);
                return (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => router.push(`/erp/stock/${m.id}`)}>
                    <TableCell>
                      <Link href={`/erp/stock/${m.id}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>{m.name}</Link>
                      <div className="text-[10px] text-muted-foreground">{m.sku || "Без SKU"} · {m.unit}</div>
                    </TableCell>
                    <TableCell>
                      {m.type ? (
                        <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.type.color }} />
                          {m.type.name}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">{money(m.unit_cost_cents)} / {m.unit}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      <span className={isLow ? "font-semibold text-amber-700" : ""}>{stock.toLocaleString("uk-UA")} {m.unit}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{reserved.toLocaleString("uk-UA")} {m.unit}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{(stock - reserved).toLocaleString("uk-UA")} {m.unit}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.supplier || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
      <TypesDialog open={typesOpen} types={types} onOpenChange={setTypesOpen} onRefresh={refetch} />
    </ListPage>
  );
}

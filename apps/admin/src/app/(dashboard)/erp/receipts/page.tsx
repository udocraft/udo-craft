"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTablePanel } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { money } from "../_lib/stock";
import { fmtDate, useDocs, type Receipt } from "../_lib/documents";

export default function ReceiptsPage() {
  const router = useRouter();
  const { items, loading } = useDocs<Receipt>("/api/erp/receipts");

  return (
    <ListPage title="Постачання" subtitle="Надходження матеріалів на склад" createHref="/erp/receipts/new" createLabel="Нове постачання">
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <AdminTablePanel>
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="h-11">Дата</TableHead>
                <TableHead className="h-11">Постачальник</TableHead>
                <TableHead className="h-11">Матеріали</TableHead>
                <TableHead className="h-11 text-right">Сума</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Історія постачань порожня</TableCell></TableRow>}
              {items.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/erp/receipts/${r.id}`)}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.supplier?.name ?? "—"}</TableCell>
                  <TableCell>
                    {r.lines.map((l) => <div key={l.id} className="text-xs">{l.material.name} · {l.quantity} {l.material.unit}</div>)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{money(r.total_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </ListPage>
  );
}

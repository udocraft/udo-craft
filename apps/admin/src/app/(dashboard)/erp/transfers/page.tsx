"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTablePanel } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { fmtDate, useDocs, type Transfer } from "../_lib/documents";

export default function TransfersPage() {
  const router = useRouter();
  const { items, loading } = useDocs<Transfer>("/api/erp/transfers");

  return (
    <ListPage title="Переміщення" subtitle="Переміщення матеріалів між складами" createHref="/erp/transfers/new" createLabel="Нове переміщення">
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <AdminTablePanel>
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="h-11">Дата</TableHead>
                <TableHead className="h-11">Звідки → Куди</TableHead>
                <TableHead className="h-11">Матеріали</TableHead>
                <TableHead className="h-11">Коментар</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Історія переміщень порожня</TableCell></TableRow>}
              {items.map((t) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => router.push(`/erp/transfers/${t.id}`)}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(t.created_at)}</TableCell>
                  <TableCell className="text-sm font-medium">{t.from_warehouse?.name} → {t.to_warehouse?.name}</TableCell>
                  <TableCell>{t.lines.map((l) => <div key={l.id} className="text-xs">{l.material.name} · {l.quantity} {l.material.unit}</div>)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.comment || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </ListPage>
  );
}

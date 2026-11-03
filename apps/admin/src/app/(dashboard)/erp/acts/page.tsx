"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTablePanel } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { docNumber, fmtDate, useDocs, type Act } from "../_lib/documents";

export default function ActsPage() {
  const router = useRouter();
  const { items, loading } = useDocs<Act>("/api/erp/processing-acts");

  return (
    <ListPage title="Акти пошиття" subtitle="Проведені акти пошиття та переробки" createHref="/erp/acts/new" createLabel="Новий акт">
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <AdminTablePanel>
          <Table>
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="h-11">Дата</TableHead>
                <TableHead className="h-11">Документ</TableHead>
                <TableHead className="h-11">Склад</TableHead>
                <TableHead className="h-11">Коментар</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">Історія актів порожня</TableCell></TableRow>}
              {items.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => router.push(`/erp/acts/${a.id}`)}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</TableCell>
                  <TableCell className="font-medium">{docNumber(a.production_order?.id)}</TableCell>
                  <TableCell className="text-sm">{a.warehouse?.name ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.comment || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </ListPage>
  );
}

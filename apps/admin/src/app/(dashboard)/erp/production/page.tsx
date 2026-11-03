"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTablePanel } from "@/components/admin-layout";
import { ListPage } from "@/components/page-templates";
import { docNumber, useDocs, useLookups, type ProductionOrder } from "../_lib/documents";

export default function ProductionPage() {
  const router = useRouter();
  const { items, loading } = useDocs<ProductionOrder>("/api/erp/production-orders");
  const { leads } = useLookups();
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  return (
    <ListPage title="Виробництво" subtitle="Виробничі документи по замовленнях" createHref="/erp/production/new" createLabel="Новий документ">
      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <AdminTablePanel>
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead className="h-11">Документ</TableHead>
                <TableHead className="h-11">Замовлення / клієнт</TableHead>
                <TableHead className="h-11">Виріб</TableHead>
                <TableHead className="h-11 text-right">К-сть</TableHead>
                <TableHead className="h-11">Статус</TableHead>
                <TableHead className="h-11">Коментар</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Виробничих документів ще немає.</TableCell></TableRow>}
              {items.map((o) => {
                const lead = leadById.get(o.lead_id || "");
                const line = o.lines?.[0];
                return (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => router.push(`/erp/production/${o.id}`)}>
                    <TableCell className="text-xs font-medium">{docNumber(o.id)}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{lead?.customer_data?.name ?? "Не прив'язано"}</div>
                      <div className="text-[10px] text-muted-foreground">{lead ? `${lead.status}${lead.customer_data?.keycrm_id ? ` · KeyCRM #${lead.customer_data.keycrm_id}` : ""}` : "—"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{line?.variant_sku?.sku ?? line?.product?.name ?? "Виріб"}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{o.quantity}</TableCell>
                    <TableCell><Badge variant={o.status === "completed" || o.status === "done" ? "default" : "secondary"} className="h-5 text-[10px]">{o.status}</Badge></TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{line?.comment || o.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminTablePanel>
      )}
    </ListPage>
  );
}

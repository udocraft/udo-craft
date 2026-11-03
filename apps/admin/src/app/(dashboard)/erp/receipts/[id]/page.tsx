"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { DetailPage } from "@/components/page-templates";
import { money } from "../../_lib/stock";
import { docNumber, fmtDate, useDocs, type Receipt } from "../../_lib/documents";

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { items, loading } = useDocs<Receipt>("/api/erp/receipts");
  const r = items.find((x) => x.id === id);

  if (loading || !r) {
    return (
      <DetailPage title={loading ? "Постачання" : "Постачання не знайдено"} backHref="/erp/receipts">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Документ не знайдено.</p>}
      </DetailPage>
    );
  }

  return (
    <DetailPage
      title={`Постачання ${docNumber(r.id)}`}
      subtitle={fmtDate(r.created_at)}
      status={<Badge variant="secondary" className="text-[10px]">{r.status}</Badge>}
      backHref="/erp/receipts"
      breadcrumbs={[{ label: "Постачання", href: "/erp/receipts" }, { label: docNumber(r.id) }]}
      aside={
        <AdminTablePanel className="divide-y divide-border text-sm">
          {([["Постачальник", r.supplier?.name ?? "—"], ["Склад", r.warehouse?.name ?? "—"], ["Сума", money(r.total_cents)], ["Коментар", r.comment || "—"]] as const).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>
          ))}
        </AdminTablePanel>
      }
    >
      <AdminSection title="Позиції">
        <AdminTablePanel className="divide-y divide-border">
          {r.lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium">{l.material.name}</span>
              <span className="tabular-nums text-muted-foreground">{l.quantity} {l.material.unit} × {money(l.unit_cost_cents)}</span>
            </div>
          ))}
        </AdminTablePanel>
      </AdminSection>
    </DetailPage>
  );
}

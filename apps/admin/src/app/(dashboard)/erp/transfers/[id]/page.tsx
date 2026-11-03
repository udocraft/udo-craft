"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { DetailPage } from "@/components/page-templates";
import { docNumber, fmtDate, useDocs, type Transfer } from "../../_lib/documents";

export default function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { items, loading } = useDocs<Transfer>("/api/erp/transfers");
  const t = items.find((x) => x.id === id);

  if (loading || !t) {
    return (
      <DetailPage title={loading ? "Переміщення" : "Переміщення не знайдено"} backHref="/erp/transfers">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Документ не знайдено.</p>}
      </DetailPage>
    );
  }

  return (
    <DetailPage
      title={`Переміщення ${docNumber(t.id)}`}
      subtitle={`${t.from_warehouse?.name ?? "—"} → ${t.to_warehouse?.name ?? "—"} · ${fmtDate(t.created_at)}`}
      status={<Badge variant="secondary" className="text-[10px]">{t.status}</Badge>}
      backHref="/erp/transfers"
      breadcrumbs={[{ label: "Переміщення", href: "/erp/transfers" }, { label: docNumber(t.id) }]}
      aside={
        <AdminTablePanel className="divide-y divide-border text-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-muted-foreground">Коментар</span><span className="text-right font-medium">{t.comment || "—"}</span></div>
        </AdminTablePanel>
      }
    >
      <AdminSection title="Позиції">
        <AdminTablePanel className="divide-y divide-border">
          {t.lines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium">{l.material.name}</span>
              <span className="tabular-nums text-muted-foreground">{l.quantity} {l.material.unit}</span>
            </div>
          ))}
        </AdminTablePanel>
      </AdminSection>
    </DetailPage>
  );
}

"use client";

import { use } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { DetailPage } from "@/components/page-templates";
import { docNumber, fmtDate, useDocs, type Act } from "../../_lib/documents";

export default function ActPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { items, loading } = useDocs<Act>("/api/erp/processing-acts");
  const a = items.find((x) => x.id === id);

  if (loading || !a) {
    return (
      <DetailPage title={loading ? "Акт пошиття" : "Акт не знайдено"} backHref="/erp/acts">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Документ не знайдено.</p>}
      </DetailPage>
    );
  }

  return (
    <DetailPage
      title={`Акт ${docNumber(a.id)}`}
      subtitle={fmtDate(a.created_at)}
      status={<Badge variant="secondary" className="text-[10px]">{a.status}</Badge>}
      backHref="/erp/acts"
      breadcrumbs={[{ label: "Акти пошиття", href: "/erp/acts" }, { label: docNumber(a.id) }]}
    >
      <AdminSection title="Деталі">
        <AdminTablePanel className="divide-y divide-border text-sm">
          {([["Виробничий документ", docNumber(a.production_order?.id)], ["Склад", a.warehouse?.name ?? "—"], ["Коментар", a.comment || "—"]] as const).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-4 py-3"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>
          ))}
        </AdminTablePanel>
      </AdminSection>
    </DetailPage>
  );
}

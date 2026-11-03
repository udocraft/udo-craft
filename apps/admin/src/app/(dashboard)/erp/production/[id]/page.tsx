"use client";

import { use, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { DetailPage } from "@/components/page-templates";
import { docNumber, fmtDate, useDocs, useLookups, type ProductionOrder } from "../../_lib/documents";

export default function ProductionDocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { items, loading } = useDocs<ProductionOrder>("/api/erp/production-orders");
  const { leads } = useLookups();
  const o = items.find((x) => x.id === id);
  const lead = useMemo(() => leads.find((l) => l.id === o?.lead_id), [leads, o]);

  if (loading || !o) {
    return (
      <DetailPage title={loading ? "Виробничий документ" : "Документ не знайдено"} backHref="/erp/production">
        {loading ? <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> : <p className="text-sm text-muted-foreground">Документ не знайдено.</p>}
      </DetailPage>
    );
  }

  return (
    <DetailPage
      title={`Виробництво ${docNumber(o.id)}`}
      subtitle={fmtDate(o.created_at)}
      status={<Badge variant="secondary" className="text-[10px]">{o.status}</Badge>}
      backHref="/erp/production"
      breadcrumbs={[{ label: "Виробництво", href: "/erp/production" }, { label: docNumber(o.id) }]}
      aside={
        <AdminTablePanel className="divide-y divide-border text-sm">
          {([["Клієнт", lead?.customer_data?.name ?? "Не прив'язано"], ["Кількість", String(o.quantity)], ["Нотатки", o.notes || "—"]] as const).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-4 py-3"><span className="text-muted-foreground">{k}</span><span className="text-right font-medium">{v}</span></div>
          ))}
        </AdminTablePanel>
      }
    >
      {(o.lines ?? []).map((line) => (
        <AdminSection key={line.id} title={line.variant_sku?.sku ?? line.product?.name ?? "Виріб"} description={`${line.quantity} шт.${line.due_date ? ` · до ${fmtDate(line.due_date)}` : ""}${line.comment ? ` · ${line.comment}` : ""}`}>
          <AdminTablePanel className="divide-y divide-border">
            {(line.material_requirements ?? []).length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Потреб у матеріалах немає</p>}
            {(line.material_requirements ?? []).map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-medium">{r.material?.name ?? "Матеріал"}</span>
                <span className="tabular-nums text-muted-foreground">
                  потрібно {r.required_quantity} · є {r.available_quantity}
                  {r.shortage_quantity > 0 && <span className="ml-2 font-semibold text-destructive">бракує {r.shortage_quantity}</span>}
                </span>
              </div>
            ))}
          </AdminTablePanel>
        </AdminSection>
      ))}
    </DetailPage>
  );
}

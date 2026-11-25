"use client";

import { useMemo } from "react";
import { Factory } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { leadStatusLabel } from "@udo-craft/shared";
import { docNumber, PRODUCTION_STATUS_LABELS, useDocs, useLookups, type ProductionOrder } from "../_lib/documents";
import { ListPage } from "@/components/page-templates";
import { DocList } from "../_lib/doc-list";

export default function ProductionPage() {
  const { items, loading, error, refetch } = useDocs<ProductionOrder>("/api/erp/production-orders");
  const { leads } = useLookups();
  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);

  return (
    <ListPage title="Виробництво" subtitle="Виробничі документи по замовленнях" createHref="/erp/production/new" createLabel="Новий документ">
      <DocList
        items={items}
        loading={loading}
        error={error}
        onRetry={refetch}
        minWidth="min-w-[920px]"
        href={(o) => `/erp/production/${o.id}`}
        rowLabel={(o) => `Виробничий документ ${docNumber(o.id)}`}
        empty={{ icon: Factory, title: "Виробничих документів ще немає", description: "Створіть документ для замовлення, щоб зарезервувати матеріали.", actionHref: "/erp/production/new", actionLabel: "Новий документ" }}
        columns={[
          { header: "Документ", cell: (o) => docNumber(o.id), className: "text-xs font-medium font-mono" },
          {
            header: "Замовлення / клієнт",
            cell: (o) => {
              const lead = leadById.get(o.lead_id || "");
              return (
                <>
                  <div className="text-sm font-medium">{lead?.customer_data?.name ?? "Не прив'язано"}</div>
                  <div className="text-xs text-muted-foreground">{lead ? `${leadStatusLabel(lead.status)}${lead.customer_data?.keycrm_id ? ` · KeyCRM #${lead.customer_data.keycrm_id}` : ""}` : "—"}</div>
                </>
              );
            },
          },
          { header: "Виріб", cell: (o) => o.lines?.[0]?.variant_sku?.sku ?? o.lines?.[0]?.product?.name ?? "Виріб", className: "text-sm" },
          { header: "К-сть", cell: (o) => o.quantity, className: "text-sm", align: "right" },
          {
            header: "Статус",
            cell: (o) => (
              <Badge variant={o.status === "done" ? "default" : "secondary"} className="h-5 text-xs">
                {PRODUCTION_STATUS_LABELS[o.status] ?? o.status}
              </Badge>
            ),
          },
          { header: "Коментар", cell: (o) => o.lines?.[0]?.comment || o.notes || "—", className: "max-w-[200px] truncate text-xs text-muted-foreground", hideOnMobile: true },
        ]}
      />
    </ListPage>
  );
}

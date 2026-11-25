"use client";

import { ClipboardCheck } from "lucide-react";
import { docNumber, fmtDate, useDocs, type Act } from "../_lib/documents";
import { ListPage } from "@/components/page-templates";
import { DocList } from "../_lib/doc-list";

export default function ActsPage() {
  const { items, loading, error, refetch } = useDocs<Act>("/api/erp/processing-acts");

  return (
    <ListPage title="Акти пошиття" subtitle="Проведені акти пошиття та переробки" createHref="/erp/acts/new" createLabel="Новий акт">
      <DocList
        items={items}
        loading={loading}
        error={error}
        onRetry={refetch}
        href={(a) => `/erp/acts/${a.id}`}
        rowLabel={(a) => `Акт від ${fmtDate(a.created_at)}, документ ${docNumber(a.production_order?.id)}`}
        empty={{ icon: ClipboardCheck, title: "Актів ще немає", description: "Акт пошиття списує матеріали за виробничим документом.", actionHref: "/erp/acts/new", actionLabel: "Новий акт" }}
        columns={[
          { header: "Дата", cell: (a) => fmtDate(a.created_at), className: "text-xs text-muted-foreground" },
          { header: "Документ", cell: (a) => docNumber(a.production_order?.id), className: "font-medium font-mono" },
          { header: "Склад", cell: (a) => a.warehouse?.name ?? "—", className: "text-sm" },
          { header: "Коментар", cell: (a) => a.comment || "—", className: "text-xs text-muted-foreground", hideOnMobile: true },
        ]}
      />
    </ListPage>
  );
}

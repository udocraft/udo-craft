"use client";

import { ArrowLeftRight } from "lucide-react";
import { fmtDate, useDocs, type Transfer } from "../_lib/documents";
import { ListPage } from "@/components/page-templates";
import { DocList } from "../_lib/doc-list";

export default function TransfersPage() {
  const { items, loading, error, refetch } = useDocs<Transfer>("/api/erp/transfers");

  return (
    <ListPage title="Переміщення" subtitle="Переміщення матеріалів між складами" createHref="/erp/transfers/new" createLabel="Нове переміщення">
      <DocList
        items={items}
        loading={loading}
        error={error}
        onRetry={refetch}
        href={(t) => `/erp/transfers/${t.id}`}
        rowLabel={(t) => `Переміщення від ${fmtDate(t.created_at)}`}
        empty={{ icon: ArrowLeftRight, title: "Переміщень ще немає", description: "Переміщення фіксують рух матеріалів між складами.", actionHref: "/erp/transfers/new", actionLabel: "Нове переміщення" }}
        columns={[
          { header: "Дата", cell: (t) => fmtDate(t.created_at), className: "text-xs text-muted-foreground" },
          { header: "Звідки → Куди", cell: (t) => `${t.from_warehouse?.name ?? "—"} → ${t.to_warehouse?.name ?? "—"}`, className: "text-sm font-medium" },
          { header: "Матеріали", cell: (t) => t.lines.map((l) => <div key={l.id} className="text-xs">{l.material.name} · {l.quantity} {l.material.unit}</div>) },
          { header: "Коментар", cell: (t) => t.comment || "—", className: "text-xs text-muted-foreground", hideOnMobile: true },
        ]}
      />
    </ListPage>
  );
}

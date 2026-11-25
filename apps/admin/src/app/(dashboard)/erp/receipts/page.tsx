"use client";

import { PackagePlus } from "lucide-react";
import { money } from "../_lib/stock";
import { fmtDate, useDocs, type Receipt } from "../_lib/documents";
import { ListPage } from "@/components/page-templates";
import { DocList } from "../_lib/doc-list";

export default function ReceiptsPage() {
  const { items, loading, error, refetch } = useDocs<Receipt>("/api/erp/receipts");

  return (
    <ListPage title="Постачання" subtitle="Надходження матеріалів на склад" createHref="/erp/receipts/new" createLabel="Нове постачання">
      <DocList
        items={items}
        loading={loading}
        error={error}
        onRetry={refetch}
        href={(r) => `/erp/receipts/${r.id}`}
        rowLabel={(r) => `Постачання від ${fmtDate(r.created_at)}${r.supplier?.name ? `, ${r.supplier.name}` : ""}`}
        empty={{ icon: PackagePlus, title: "Постачань ще немає", description: "Оформіть надходження матеріалів, щоб вони з'явилися на складі.", actionHref: "/erp/receipts/new", actionLabel: "Нове постачання" }}
        columns={[
          { header: "Дата", cell: (r) => fmtDate(r.created_at), className: "text-xs text-muted-foreground" },
          { header: "Постачальник", cell: (r) => r.supplier?.name ?? "—", className: "font-medium" },
          { header: "Матеріали", cell: (r) => r.lines.map((l) => <div key={l.id} className="text-xs">{l.material.name} · {l.quantity} {l.material.unit}</div>) },
          { header: "Сума", cell: (r) => money(r.total_cents), className: "font-medium", align: "right" },
        ]}
      />
    </ListPage>
  );
}

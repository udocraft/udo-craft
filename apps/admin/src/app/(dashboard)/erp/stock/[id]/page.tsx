"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailPage } from "@/components/page-templates";
import { AdminSection, AdminTablePanel } from "@/components/admin-layout";
import { kindLabel, money, useStockData } from "../../_lib/stock";

export default function StockItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { materials, loading } = useStockData();
  const [deleting, setDeleting] = useState(false);
  const m = materials.find((item) => item.id === id);

  if (loading) {
    return (
      <DetailPage title="Позиція складу" backHref="/erp/stock">
        <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      </DetailPage>
    );
  }
  if (!m) {
    return (
      <DetailPage title="Позицію не знайдено" backHref="/erp/stock">
        <p className="text-sm text-muted-foreground">Можливо, її вже видалено.</p>
      </DetailPage>
    );
  }

  const stock = Number(m.stock_quantity || 0);
  const reserved = Number(m.reserved_quantity || 0);
  const reorder = Number(m.reorder_point || 0);
  const isLow = reorder > 0 && stock <= reorder;
  const qty = (n: number) => `${n.toLocaleString("uk-UA")} ${m.unit}`;

  const remove = async () => {
    if (!confirm(`Видалити "${m.name}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/erp/materials/${m.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Позицію видалено");
      router.push("/erp/stock");
    } catch {
      toast.error("Не вдалося видалити позицію. Можливо, вона використовується в рецептурах товарів.");
      setDeleting(false);
    }
  };

  const rows: [string, React.ReactNode][] = [
    ["SKU", m.sku || "—"],
    ["Тип", m.type?.name ?? "—"],
    ["Клас", kindLabel(m.kind)],
    ["Одиниця", m.unit],
    ["Собівартість", `${money(m.unit_cost_cents)} / ${m.unit}`],
    ["Постачальник", m.supplier || "—"],
    ["Нотатки", m.notes || "—"],
  ];

  return (
    <DetailPage
      title={m.name}
      subtitle={`${m.sku || "Без SKU"} · ${m.unit}`}
      status={isLow ? <Badge variant="outline" className="border-amber-300 text-amber-700">Низький залишок</Badge> : undefined}
      backHref="/erp/stock"
      breadcrumbs={[{ label: "Склад", href: "/erp/stock" }, { label: m.name }]}
      actions={
        <>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={remove} disabled={deleting}>
            Видалити
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href={`/erp/stock/${m.id}/edit`} />}>
            Редагувати
          </Button>
        </>
      }
      aside={
        <AdminTablePanel className="divide-y divide-border">
          {([
            ["Залишок", qty(stock)],
            ["Резерв", qty(reserved)],
            ["Доступно", qty(stock - reserved)],
            ["Мін. залишок", qty(reorder)],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium tabular-nums">{value}</span>
            </div>
          ))}
        </AdminTablePanel>
      }
    >
      <AdminSection title="Деталі">
        <AdminTablePanel className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[160px_1fr] gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </AdminTablePanel>
      </AdminSection>
    </DetailPage>
  );
}

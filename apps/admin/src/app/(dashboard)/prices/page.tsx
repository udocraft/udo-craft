"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { DEFAULT_DISCOUNT_GRID } from "@udo-craft/shared";
import { Button } from "@/components/ui/button";
import { AdminTablePanel, AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePrintTypes } from "@/hooks/use-print-types";
import PriceGrid from "./_components/PriceGrid";

const DISCOUNTS_TAB = "discounts";

// Default volume discount from the shared order contract; products can override it.
const DISCOUNT_TIERS = [{ qty: 1, discount_pct: 0 }, ...DEFAULT_DISCOUNT_GRID].map((tier, i, all) => ({
  min: tier.qty,
  max: all[i + 1] ? all[i + 1].qty - 1 : Infinity,
  pct: tier.discount_pct,
}));

function PricesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { types, loading } = usePrintTypes();
  const [create, setCreate] = useState<(() => void) | null>(null);
  const onCreateReady = useCallback((handler: () => void) => setCreate(() => handler), []);

  const requested = searchParams.get("type");
  const tab = requested === DISCOUNTS_TAB ? DISCOUNTS_TAB : types.find((t) => t.id === requested)?.id ?? types[0]?.id ?? "";
  const current = types.find((t) => t.id === tab);

  const tabs = [
    ...types.map((t) => ({
      key: t.id,
      label: t.label,
      meta: !t.is_active ? <span className="rounded bg-muted px-1.5 text-[11px] font-normal text-muted-foreground">приховано</span> : undefined,
    })),
    { key: DISCOUNTS_TAB, label: "Знижки за кількість" },
  ];

  return (
    <DashboardPage
      title="Ціни"
      subtitle="Ціни друку за розміром і кількістю, які бачить клієнт у конструкторі"
      toolbar={
        loading && types.length === 0 ? (
          <div className="flex h-12 items-center gap-6 border-b border-border px-4 md:px-6">
            {[64, 80, 88, 96].map((w) => <Skeleton key={w} className="h-3.5" style={{ width: w }} />)}
          </div>
        ) : (
          <AdminTabs tabs={tabs} value={tab} onValueChange={(next) => router.replace(`/prices?type=${next}`)} className="px-4 md:px-6" />
        )
      }
      actions={
        tab !== DISCOUNTS_TAB && current && create ? (
          <Button size="sm" onClick={create}><Plus className="size-4" />Додати ціну</Button>
        ) : undefined
      }
    >
      <div className="pt-4">
        {tab === DISCOUNTS_TAB ? (
          <div className="px-4 pb-6 md:px-6">
            <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
              Знижка на все замовлення залежно від кількості одиниць. Діє за замовчуванням; у товарі можна задати власну сітку.
            </p>
            <AdminTablePanel bleed>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Кількість</TableHead>
                    <TableHead>Знижка</TableHead>
                    <TableHead>Приклад (від 100 ₴)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DISCOUNT_TIERS.map((tier) => (
                    <TableRow key={tier.min}>
                      <TableCell className="font-medium tabular-nums">
                        {tier.min}–{tier.max === Infinity ? "∞" : tier.max} шт
                      </TableCell>
                      <TableCell>
                        <span className={tier.pct > 0 ? "rounded-md bg-primary/10 px-2 py-0.5 text-sm font-semibold text-primary" : "text-muted-foreground"}>
                          {tier.pct}%
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {tier.pct > 0 ? (
                          <><span className="line-through">100 ₴</span><span className="ml-2 font-medium text-foreground">{100 - tier.pct} ₴</span></>
                        ) : "100 ₴"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminTablePanel>
          </div>
        ) : current ? (
          <PriceGrid key={current.id} printType={current.id} printTypeLabel={current.label} onCreateActionReady={onCreateReady} />
        ) : null}
      </div>
    </DashboardPage>
  );
}

export default function PricesPage() {
  return (
    <Suspense>
      <PricesInner />
    </Suspense>
  );
}

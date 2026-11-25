"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import PrintPresetsTab from "@/components/print-presets-tab";
import PrintTypesTab from "./_components/PrintTypesTab";
import PricesTab from "./_components/PricesTab";

type PrintsTab = "prints" | "types" | "prices";

const TABS = [
  { key: "prints", label: "Бібліотека" },
  { key: "types", label: "Типи друку" },
  { key: "prices", label: "Ціни" },
] as const;

function PrintsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab: PrintsTab = rawTab === "types" ? "types" : rawTab === "prices" || rawTab === "sizes" ? "prices" : "prints";
  // Old links to the former "sizes" tab open the prices tab.
  useEffect(() => { if (rawTab === "sizes") router.replace("/prints?tab=prices"); }, [rawTab, router]);
  const [presetCreate, setPresetCreate] = useState<(() => void) | null>(null);
  const [typeCreate, setTypeCreate] = useState<(() => void) | null>(null);

  const onPresetReady = useCallback((handler: () => void) => setPresetCreate(() => handler), []);
  const onTypeReady = useCallback((handler: () => void) => setTypeCreate(() => handler), []);
  const [priceCreate, setPriceCreate] = useState<(() => void) | null>(null);
  const onPriceReady = useCallback((handler: (() => void) | null) => setPriceCreate(() => handler), []);

  const create =
    tab === "prints" ? { label: "Додати принт", onClick: presetCreate }
    : tab === "types" ? { label: "Додати тип", onClick: typeCreate }
    : { label: "Додати ціну", onClick: priceCreate };

  return (
    <DashboardPage
      title="Принти"
      toolbar={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.replace(`/prints?tab=${next}`)} className="px-4 md:px-6" />}
      actions={create.onClick ? <Button size="sm" onClick={create.onClick}><Plus className="size-4" />{create.label}</Button> : undefined}
    >
      <div className={tab === "types" ? "pt-4" : undefined}>
        {tab === "prints" && <PrintPresetsTab onCreateActionReady={onPresetReady} showHeaderAction={false} />}
        {tab === "types" && <PrintTypesTab onCreateActionReady={onTypeReady} />}
        {tab === "prices" && <PricesTab onCreateActionReady={onPriceReady} />}
      </div>
    </DashboardPage>
  );
}

export default function PrintsPage() {
  return (
    <Suspense>
      <PrintsInner />
    </Suspense>
  );
}

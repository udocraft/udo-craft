"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import PrintPresetsTab from "@/components/print-presets-tab";
import PrintTypesTab from "./_components/PrintTypesTab";
import PrintSizesTab from "./_components/PrintSizesTab";

type PrintsTab = "prints" | "types" | "sizes";

const TABS = [
  { key: "prints", label: "Пресети" },
  { key: "types", label: "Типи" },
  { key: "sizes", label: "Розміри" },
] as const;

export default function PrintsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") || "prints") as PrintsTab;
  const [presetCreate, setPresetCreate] = useState<(() => void) | null>(null);
  const [sizeCreate, setSizeCreate] = useState<(() => void) | null>(null);

  const setPresetCreateHandler = useCallback((handler: () => void) => {
    setPresetCreate(() => handler);
  }, []);

  const setSizeCreateHandler = useCallback((handler: () => void) => {
    setSizeCreate(() => handler);
  }, []);

  const createConfig = {
    prints: { label: "Додати принт", onClick: presetCreate },
    types: null,
    sizes: { label: "Додати розмір", onClick: sizeCreate },
  }[tab];

  return (
    <DashboardPage
      title="Бібліотека принтів"
      titleAccessory={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.push(`/prints?tab=${next}`)} />}
      actions={

        createConfig?.onClick ? (
          <Button size="sm" onClick={createConfig.onClick}>
            {createConfig.label}
          </Button>
        ) : undefined
      }
    >
      {tab === "prints" && <PrintPresetsTab onCreateActionReady={setPresetCreateHandler} showHeaderAction={false} />}
      {tab === "types" && <PrintTypesTab />}
      {tab === "sizes" && <PrintSizesTab onCreateActionReady={setSizeCreateHandler} showSectionAction={false} />}
    </DashboardPage>
  );
}

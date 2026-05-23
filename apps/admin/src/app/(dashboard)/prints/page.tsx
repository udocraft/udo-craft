"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

  return (
    <DashboardPage
      title="Принти"
      tabs={<AdminTabs tabs={TABS} value={tab} onValueChange={(next) => router.push(`/prints?tab=${next}`)} />}
    >
      {tab === "prints" && <PrintPresetsTab />}
      {tab === "types" && <PrintTypesTab />}
      {tab === "sizes" && <PrintSizesTab />}
    </DashboardPage>
  );
}

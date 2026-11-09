"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminTabs } from "@/components/admin-layout";
import { DashboardPage } from "@/components/dashboard-page";
import { CardSkeleton, FormSkeleton } from "./_components/skeletons";

const ProfileTab = dynamic(() => import("./_components/ProfileTab"), { loading: () => <FormSkeleton rows={2} /> });
const SecurityTab = dynamic(() => import("./_components/SecurityTab"), { loading: () => <FormSkeleton rows={1} /> });
const NotificationsTab = dynamic(() => import("./_components/NotificationsTab"), { loading: () => <CardSkeleton rows={3} /> });
const SystemTab = dynamic(() => import("./_components/SystemTab").then((m) => m.SystemTab), { loading: () => <CardSkeleton rows={4} /> });
const IntegrationsTab = dynamic(() => import("./_components/IntegrationsTab").then((m) => m.IntegrationsTab), { loading: () => <CardSkeleton rows={3} /> });

const TABS = [
  { key: "profile", label: "Профіль" },
  { key: "security", label: "Безпека" },
  { key: "notifications", label: "Сповіщення" },
  { key: "system", label: "Система" },
  { key: "integrations", label: "Інтеграції" },
] as const;

type Tab = (typeof TABS)[number]["key"];

const PANELS: Record<Tab, React.ComponentType> = {
  profile: ProfileTab,
  security: SecurityTab,
  notifications: NotificationsTab,
  system: SystemTab,
  integrations: IntegrationsTab,
};

function SettingsContent() {
  const router = useRouter();
  const param = useSearchParams().get("tab");
  const tab: Tab = TABS.some((t) => t.key === param) ? (param as Tab) : "profile";
  const Panel = PANELS[tab];

  return (
    <DashboardPage
      title="Налаштування"
      toolbar={
        <AdminTabs
          tabs={TABS}
          value={tab}
          onValueChange={(next) => router.push(`/settings?tab=${next}`, { scroll: false })}
          className="px-4 md:px-6"
        />
      }
    >
      <div className="flex justify-center px-4 py-6 md:px-6">
        <div className="w-full max-w-2xl space-y-4">
          <Panel />
        </div>
      </div>
    </DashboardPage>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

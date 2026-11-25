"use client";

import { DashboardPage } from "@/components/dashboard-page";
import { BlockEditor } from "../_components/BlockEditor";

export default function CmsPrivacyPage() {
  return (
    <DashboardPage
      title="Політика конфіденційності"
      subtitle="Текст сторінки /privacy клієнтського сайту"
      breadcrumbs={[{ label: "Контент сайту", href: "/cms" }, { label: "Політика конфіденційності" }]}
    >
      <div className="mx-auto max-w-3xl">
        <BlockEditor slug="page_privacy" pageTitle="Політика конфіденційності" />
      </div>
    </DashboardPage>
  );
}

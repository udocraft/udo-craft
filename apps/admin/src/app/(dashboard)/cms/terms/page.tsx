"use client";

import { DashboardPage } from "@/components/dashboard-page";
import { BlockEditor } from "../_components/BlockEditor";

export default function CmsTermsPage() {
  return (
    <DashboardPage
      title="Умови та правила"
      subtitle="Текст сторінки /terms клієнтського сайту"
      breadcrumbs={[{ label: "Контент сайту", href: "/cms" }, { label: "Умови та правила" }]}
    >
      <div className="mx-auto max-w-3xl">
        <BlockEditor slug="page_terms" pageTitle="Умови та правила" />
      </div>
    </DashboardPage>
  );
}

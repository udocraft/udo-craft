"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardPage } from "@/components/dashboard-page";
import { AdminTabs } from "@/components/admin-layout";

/**
 * Three page templates for linear CRUD. Every entity uses the same flow:
 *   list (ListPage) -> /new or /[id]/edit (FormPage) -> /[id] (DetailPage)
 * A page never shows a list and a create/edit form at the same time.
 */

type Crumb = { label: string; href?: string };
type TabDef<T extends string> = readonly { key: T; label: string; meta?: React.ReactNode }[];

// ── ListPage ──────────────────────────────────────────────────────────────────

interface ListPageProps<T extends string> {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** Primary action. Navigates to the create page, never opens a form inline. */
  createHref?: string;
  createLabel?: string;
  /** Extra secondary actions, rendered before the create button. */
  actions?: React.ReactNode;
  tabs?: TabDef<T>;
  tab?: T;
  onTabChange?: (tab: T) => void;
  /** Search and filters row (AdminToolbar). */
  filters?: React.ReactNode;
  children: React.ReactNode;
}

export function ListPage<T extends string = string>({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  createLabel = "Створити",
  actions,
  tabs,
  tab,
  onTabChange,
  filters,
  children,
}: ListPageProps<T>) {
  return (
    <DashboardPage
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs}
      maxWidth="7xl"
      toolbar={
        tabs && tab !== undefined && onTabChange ? (
          <AdminTabs tabs={tabs} value={tab} onValueChange={onTabChange} className="px-4 md:px-6" />
        ) : undefined
      }
      actions={
        <>
          {actions}
          {createHref && (
            <Button size="sm" nativeButton={false} render={<Link href={createHref} />}>
              <Plus className="size-4" />
              {createLabel}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col">
        {filters}
        <div className="px-4 pb-6 md:px-6">{children}</div>
      </div>
    </DashboardPage>
  );
}

// ── FormPage ──────────────────────────────────────────────────────────────────

interface FormPageProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Where Back and Cancel go: always the list or the detail page. */
  backHref: string;
  breadcrumbs?: Crumb[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  submitting?: boolean;
  /** Extra buttons next to Save, e.g. Delete on edit pages. */
  extraActions?: React.ReactNode;
  children: React.ReactNode;
}

export function FormPage({
  title,
  subtitle,
  backHref,
  breadcrumbs,
  onSubmit,
  submitLabel = "Зберегти",
  submitting,
  extraActions,
  children,
}: FormPageProps) {
  return (
    <DashboardPage title={title} subtitle={subtitle} backHref={backHref} breadcrumbs={breadcrumbs} maxWidth="2xl">
      <form onSubmit={onSubmit} className="flex min-h-full flex-col">
        <div className="flex-1 space-y-6 px-4 py-6 md:px-6">{children}</div>
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-background px-4 py-3 md:px-6">
          {extraActions && <div className="mr-auto flex items-center gap-2">{extraActions}</div>}
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={backHref} />}>
            Скасувати
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Збереження..." : submitLabel}
          </Button>
        </div>
      </form>
    </DashboardPage>
  );
}

// ── DetailPage ────────────────────────────────────────────────────────────────

interface DetailPageProps<T extends string> {
  title: string;
  subtitle?: React.ReactNode;
  /** Status badge or similar, shown next to the title. */
  status?: React.ReactNode;
  backHref: string;
  breadcrumbs?: Crumb[];
  /** Edit, delete and state-change buttons. */
  actions?: React.ReactNode;
  tabs?: TabDef<T>;
  tab?: T;
  onTabChange?: (tab: T) => void;
  /** Optional right column (summary, meta). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailPage<T extends string = string>({
  title,
  subtitle,
  status,
  backHref,
  breadcrumbs,
  actions,
  tabs,
  tab,
  onTabChange,
  aside,
  children,
}: DetailPageProps<T>) {
  return (
    <DashboardPage
      title={title}
      subtitle={subtitle}
      titleAccessory={status}
      backHref={backHref}
      breadcrumbs={breadcrumbs}
      maxWidth="7xl"
      actions={actions}
      toolbar={
        tabs && tab !== undefined && onTabChange ? (
          <AdminTabs tabs={tabs} value={tab} onValueChange={onTabChange} className="px-4 md:px-6" />
        ) : undefined
      }
    >
      <div className={cn("grid gap-6 px-4 py-6 md:px-6", aside && "lg:grid-cols-[1fr_320px]")}>
        <div className="min-w-0 space-y-6">{children}</div>
        {aside && <aside className="space-y-4">{aside}</aside>}
      </div>
    </DashboardPage>
  );
}

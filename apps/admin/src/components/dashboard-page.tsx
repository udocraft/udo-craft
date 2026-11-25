"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DashboardPageProps {
  title: string;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  titleAccessory?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
  padding?: string;
  toolbar?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardPage({
  title,
  eyebrow,
  subtitle,
  actions,
  titleAccessory,
  children,
  className,
  contentClassName,
  backHref,
  backLabel = "Назад",
  breadcrumbs,
  maxWidth = "full",
  toolbar,
}: DashboardPageProps) {
  const maxWidthClass: Record<string, string> = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  };

  // Only ancestors are shown as breadcrumbs; the current page is the h1.
  const trail: BreadcrumbItem[] = breadcrumbs ? breadcrumbs.slice(0, -1) : [];

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-background", className)}>
      {/* ── One header per page: sidebar toggle, breadcrumbs + title, actions; optional tabs below ── */}
      <header className={cn("shrink-0 bg-background", !toolbar && "border-b border-border")}>
        <div className="flex min-h-16 items-center gap-3 px-4 py-3 md:px-6">
          <SidebarTrigger className="-ml-1.5 size-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" />
          <Separator orientation="vertical" className="h-5" />

          <div className="min-w-0 flex-1">
            {trail.length > 0 && (
              <nav aria-label="Навігація сторінкою" className="mb-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                {trail.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" aria-hidden="true" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="max-w-[180px] truncate rounded transition-colors hover:text-foreground">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="max-w-[180px] truncate">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            {eyebrow && !trail.length && (
              <p className="mb-0.5 text-xs font-medium text-muted-foreground">{eyebrow}</p>
            )}
            <div className="flex min-w-0 items-center gap-2.5">
              {backHref && trail.length === 0 && (
                <Link
                  href={backHref}
                  aria-label={backLabel}
                  className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              )}
              <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground md:text-xl">
                {title}
              </h1>
              {titleAccessory && <div className="min-w-0 shrink">{titleAccessory}</div>}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        {toolbar}
      </header>

      <div className={cn("flex-1 overflow-y-auto", contentClassName)}>
        <div className={cn("mx-auto flex h-full flex-col", maxWidthClass[maxWidth] ?? "max-w-full")}>
          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

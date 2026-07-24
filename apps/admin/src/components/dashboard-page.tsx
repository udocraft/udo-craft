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

  // Build breadcrumb trail
  const crumbs: BreadcrumbItem[] = breadcrumbs ?? (backHref ? [{ label: backLabel, href: backHref }, { label: title }] : []);

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-background", className)}>

      {/* ── Top bar: sidebar trigger + breadcrumb ── */}
      <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border/60 bg-background px-3 md:px-4">
        <SidebarTrigger className="shrink-0 -ml-1 size-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" />

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        {crumbs.length > 0 ? (
          <nav aria-label="breadcrumb" className="flex items-center gap-1 min-w-0">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn(
                      "text-xs truncate max-w-[180px]",
                      isLast ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : (
          <span className="text-xs font-medium text-muted-foreground/70 truncate">{title}</span>
        )}
      </header>

      {/* ── Scrollable content ── */}
      <div className={cn("flex-1 overflow-y-auto", contentClassName)}>
        <div className={cn("mx-auto h-full flex flex-col", maxWidthClass[maxWidth] ?? "max-w-full")}>

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4 px-4 md:px-6 pt-6 pb-5">
            <div className="min-w-0 flex-1 space-y-1">
              {eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
                  {eyebrow}
                </p>
              )}
              <div className="flex min-w-0 items-center gap-3">
                {backHref && (
                  <Link
                    href={backHref}
                    aria-label={backLabel}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </Link>
                )}
                <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl leading-none">
                  {title}
                </h1>
                {titleAccessory && (
                  <div className="min-w-0 shrink">{titleAccessory}</div>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground leading-snug">{subtitle}</p>
              )}
            </div>

            {actions && (
              <div className="flex shrink-0 items-center gap-2 pt-0.5">
                {actions}
              </div>
            )}
          </div>

          {/* ── Optional toolbar (filters/search row) ── */}
          {toolbar && (
            <div className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              {toolbar}
            </div>
          )}

          {/* ── Page body ── */}
          <div className="flex-1">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}

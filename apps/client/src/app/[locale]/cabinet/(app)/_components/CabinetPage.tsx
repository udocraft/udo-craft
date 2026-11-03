"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Tab<T extends string> {
  key: T;
  label: string;
  badge?: number;
}

interface CabinetPageProps<T extends string> {
  title: string;
  subtitle?: React.ReactNode;
  /** Shows a back arrow to this route. */
  backHref?: string;
  backLabel?: string;
  /** Status badge or similar, shown next to the title. */
  status?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: Tab<T>[];
  tab?: T;
  onTabChange?: (tab: T) => void;
  /** Content that manages its own scrolling (the chat) fills the page instead. */
  fill?: boolean;
  children: React.ReactNode;
}

/** Page template for every cabinet screen: header, optional tabs, scrolling content. */
export function CabinetPage<T extends string = string>({
  title,
  subtitle,
  backHref,
  backLabel,
  status,
  actions,
  tabs,
  tab,
  onTabChange,
  fill,
  children,
}: CabinetPageProps<T>) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="shrink-0 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 md:px-6">
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-center gap-3">
              {backHref && (
                <Link
                  href={backHref}
                  aria-label={backLabel}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </Link>
              )}
              <h1 className="truncate text-xl font-semibold leading-none tracking-tight md:text-2xl">{title}</h1>
              {status}
            </div>
            {subtitle && <p className="text-sm leading-snug text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {tabs && tab !== undefined && onTabChange && (
          <nav className="flex gap-6 overflow-x-auto px-4 md:px-6" aria-label={title}>
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onTabChange(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-2 text-sm font-medium transition-colors focus-visible:outline-none",
                  tab === item.key
                    ? "text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {!!item.badge && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        )}
      </div>
      <div className={cn("min-h-0 flex-1", fill ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>{children}</div>
    </div>
  );
}

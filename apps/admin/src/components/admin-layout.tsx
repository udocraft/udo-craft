"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type AdminTabsProps<T extends string> = {
  tabs: readonly { key: T; label: string; meta?: React.ReactNode }[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
};

export function AdminTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
}: AdminTabsProps<T>) {
  return (
    <nav className={cn("flex h-full min-w-0 items-center gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onValueChange(tab.key)}
          className={cn(
            "flex h-full min-w-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            value === tab.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <span className="truncate">{tab.label}</span>
          {tab.meta}
        </button>
      ))}
    </nav>
  );
}

export function AdminToolbar({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2 md:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}>) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function AdminTablePanel({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

export function AdminCardGrid({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3", className)}>
      {children}
    </div>
  );
}

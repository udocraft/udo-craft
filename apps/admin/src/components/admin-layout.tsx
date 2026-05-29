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
    <nav className={cn("flex items-center gap-6 overflow-x-auto border-b border-transparent px-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onValueChange(tab.key)}
          className={cn(
            "relative flex h-16 min-w-0 items-center gap-2 px-1 text-sm font-medium transition-colors focus-visible:outline-none",
            value === tab.key
              ? "text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary"
              : "text-muted-foreground hover:text-foreground"
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
        "flex h-14 items-center gap-2 border-b border-border bg-background px-4 md:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminFilter({
  label,
  value,
  active,
  onClick,
  onClear,
  icon: Icon,
}: {
  label: string;
  value?: string;
  active?: boolean;
  onClick?: () => void;
  onClear?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "border-primary/30 bg-primary/5 text-primary shadow-sm"
            : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground"
        )}
      >
        {Icon && <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground/70")} />}
        <span>{label}</span>
        {value && (
          <>
            <span className="mx-1 opacity-30">/</span>
            <span className="max-w-[120px] truncate font-semibold text-foreground">{value}</span>
          </>
        )}
      </button>
      {active && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear ${label} filter`}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

import { X } from "lucide-react";

export function AdminTablePanel({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("overflow-hidden border-b border-border bg-card", className)}>
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
}: React.PropsWithChildren<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
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

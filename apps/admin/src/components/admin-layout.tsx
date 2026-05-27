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
        "flex h-10 items-center gap-2 border-b border-border bg-background px-4 md:px-6",
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
}: {
  label: string;
  value?: string;
  active?: boolean;
  onClick?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-md border border-dashed border-border px-2 text-[11px] font-medium transition-colors hover:bg-muted",
          active && "border-solid border-primary bg-primary/5 text-primary"
        )}
      >
        {label}
        {value && <span className="text-muted-foreground">/</span>}
        {value && <span className="max-w-[80px] truncate">{value}</span>}
      </button>
      {active && onClear && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
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

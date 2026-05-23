"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  title: string;
  titleAccessory?: React.ReactNode;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function DashboardHeader({
  title,
  titleAccessory,
  eyebrow,
  subtitle,
  description,
  actions,
  className,
  sticky = true,
}: DashboardHeaderProps) {
  const supportingText = subtitle ?? description;

  return (
    <header
      className={cn(
        "z-30 flex min-h-16 shrink-0 flex-col gap-3 border-b border-border bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-lg font-semibold leading-tight tracking-tight text-foreground md:text-xl">{title}</h1>
          {titleAccessory && <div className="shrink-0">{titleAccessory}</div>}
        </div>
        {supportingText && (
          <div className="mt-0.5 flex min-h-4 items-center gap-2 text-xs text-muted-foreground md:text-sm">
            {supportingText}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

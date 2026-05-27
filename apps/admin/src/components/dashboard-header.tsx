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
  beforeTitle?: React.ReactNode;
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
  beforeTitle,
  className,
  sticky = true,
}: DashboardHeaderProps) {
  // Description/subtitle is removed from the primary header to maintain consistency as per user request
  // but kept as a prop for compatibility if needed for a different layout in the future.
  // The user explicitly asked for "header(no description)".

  return (
    <header
      className={cn(
        "z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {beforeTitle}
        {eyebrow && (
          <p className="mr-2 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-base font-semibold leading-none tracking-tight text-foreground md:text-lg">{title}</h1>
          {titleAccessory && <div className="min-w-0 shrink">{titleAccessory}</div>}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

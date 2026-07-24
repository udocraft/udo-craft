"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
  actions,
  beforeTitle,
  className,
  sticky = true,
}: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-3 md:px-4",
        sticky && "sticky top-0",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* Sidebar trigger always present on the left */}
        <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4 mx-1 shrink-0" />

        {beforeTitle}

        {eyebrow && (
          <p className="hidden sm:block mr-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            {eyebrow}
          </p>
        )}

        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="truncate text-sm font-semibold leading-none tracking-tight text-foreground md:text-base">
            {title}
          </h1>
          {titleAccessory && <div className="min-w-0 shrink">{titleAccessory}</div>}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {actions}
        </div>
      )}
    </header>
  );
}

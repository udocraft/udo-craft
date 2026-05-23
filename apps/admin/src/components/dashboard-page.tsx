"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard-header";

interface DashboardPageProps {
  title: string;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardPage({
  title,
  eyebrow,
  subtitle,
  actions,
  tabs,
  children,
  className,
  contentClassName,
}: DashboardPageProps) {
  return (
    <div className={cn("flex h-0 flex-1 flex-col overflow-hidden", className)}>
      <DashboardHeader title={title} eyebrow={eyebrow} subtitle={subtitle} actions={actions} />
      {tabs && (
        <div className="flex h-12 shrink-0 items-center overflow-x-auto border-b border-border bg-background px-4 md:px-6">
          {tabs}
        </div>
      )}
      <div className={cn("flex-1 overflow-y-auto bg-muted/40 selection:bg-primary/10", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

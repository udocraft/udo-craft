"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard-header";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
}

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
  maxWidth = "full",
}: DashboardPageProps) {
  const maxWidthClass = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  }[maxWidth];

  return (
    <div className={cn("flex h-0 flex-1 flex-col overflow-hidden bg-background", className)}>
      <DashboardHeader 
        title={title} 
        titleAccessory={titleAccessory} 
        eyebrow={eyebrow} 
        subtitle={subtitle} 
        actions={actions}
        beforeTitle={backHref ? (
          <Link 
            href={backHref}
            className="mr-2 flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        ) : undefined}
      />
      <div className={cn("flex-1 overflow-y-auto selection:bg-primary/10", contentClassName)}>
        <div className={cn("mx-auto h-full", maxWidthClass)}>
          {children}
        </div>
      </div>
    </div>
  );
}

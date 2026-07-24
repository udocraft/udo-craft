"use client";

import { cn } from "@/lib/utils";

export interface SettingsCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export function SettingsCard({
  title,
  description,
  children,
  className,
  ...props
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 space-y-5",
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className="space-y-1 mb-5">
          {title && <h3 className="font-semibold leading-none tracking-tight text-foreground">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

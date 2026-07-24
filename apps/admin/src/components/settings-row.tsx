"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface SettingsRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  disabled?: boolean;
}

export function SettingsRow({
  label,
  description,
  action,
  disabled,
  className,
  children,
  ...props
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 transition-opacity",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
      {...props}
    >
      <div className="space-y-1 max-w-[80%]">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{action || children}</div>
    </div>
  );
}

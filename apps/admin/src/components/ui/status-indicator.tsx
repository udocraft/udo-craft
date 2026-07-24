"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";

const statusVariants = cva("inline-flex items-center gap-1 text-xs font-medium", {
  variants: {
    status: {
      ok: "text-success",
      warning: "text-warning",
      error: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    status: "ok",
  },
});

export interface StatusIndicatorProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusVariants> {
  label?: string;
}

export function StatusIndicator({
  status,
  label,
  className,
  ...props
}: StatusIndicatorProps) {
  let Icon = CheckCircle2;
  if (status === "warning") Icon = AlertTriangle;
  if (status === "error") Icon = XCircle;
  if (status === "info") Icon = Info;

  let defaultLabel = "OK";
  if (status === "warning") defaultLabel = "Потребує уваги";
  if (status === "error") defaultLabel = "Помилка";
  if (status === "info") defaultLabel = "Інфо";

  return (
    <span className={cn(statusVariants({ status }), className)} {...props}>
      <Icon className="size-3.5" />
      {label ?? defaultLabel}
    </span>
  );
}

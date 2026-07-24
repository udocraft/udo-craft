import { cn } from "@/lib/utils";

export type LeadStatus = "draft" | "new" | "in_progress" | "production" | "completed" | "archived";

const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; dot: string; text: string; bg: string; className: string }
> = {
  draft:       { label: "Чернетка",    dot: "bg-slate-400",   text: "text-slate-600",   bg: "bg-slate-100",   className: "bg-slate-400" },
  new:         { label: "Новий",       dot: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",     className: "bg-blue-500" },
  in_progress: { label: "В роботі",    dot: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",    className: "bg-amber-500" },
  production:  { label: "Виробництво", dot: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",   className: "bg-violet-500" },
  completed:   { label: "Завершено",   dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50",  className: "bg-emerald-500" },
  archived:    { label: "Архів",       dot: "bg-slate-300",   text: "text-slate-500",   bg: "bg-slate-50",    className: "bg-slate-400" },
};

interface StatusBadgeProps {
  status: LeadStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as LeadStatus] ?? {
    label: status,
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted",
    className: "bg-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        config.bg,
        config.text,
        className
      )}
      aria-label={`Статус: ${config.label}`}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };

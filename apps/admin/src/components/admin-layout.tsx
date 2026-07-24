"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── AdminTabs ─────────────────────────────────────────────────────────────────

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
    <nav className={cn("flex items-center gap-6 overflow-x-auto border-b border-border px-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onValueChange(tab.key)}
          className={cn(
            "relative flex h-12 min-w-0 items-center gap-2 px-1 text-sm font-medium transition-colors focus-visible:outline-none",
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

// ── AdminToolbar ──────────────────────────────────────────────────────────────

export function AdminToolbar({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── AdminFilter ───────────────────────────────────────────────────────────────
// Renders a pill that opens a Popover with a list of options.
// Pass `options` for the dropdown list, or just `onClick` for a custom handler.

export interface FilterOption {
  value: string;
  label: string;
  /** optional colour dot */
  color?: string;
}

interface AdminFilterProps {
  label: string;
  /** Currently selected value key */
  value?: string;
  active?: boolean;
  /** Structured options — renders a built-in popover checklist */
  options?: FilterOption[];
  onSelect?: (value: string) => void;
  /** Called when the × clear button is pressed */
  onClear?: () => void;
  /** Fallback custom click handler when no options provided */
  onClick?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export function AdminFilter({
  label,
  value,
  active,
  options,
  onSelect,
  onClear,
  onClick,
  icon: Icon,
}: AdminFilterProps) {
  const [open, setOpen] = React.useState(false);

  // Display label for the active value
  const activeLabel = React.useMemo(() => {
    if (!value || value === "all") return undefined;
    return options?.find((o) => o.value === value)?.label ?? value;
  }, [value, options]);

  const triggerCls = cn(
    "flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "border-primary/30 bg-primary/5 text-primary"
      : "border-border/60 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
  );

  const triggerContent = (
    <>
      {Icon && (
        <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground/60")} />
      )}
      <span>{label}</span>
      {activeLabel && (
        <>
          <span className="opacity-30">:</span>
          <span className="max-w-[100px] truncate font-semibold text-foreground">{activeLabel}</span>
        </>
      )}
      {options && (
        <ChevronDown
          className={cn(
            "size-3 shrink-0 transition-transform duration-150",
            open ? "rotate-180" : "",
            active ? "text-primary/60" : "text-muted-foreground/40"
          )}
        />
      )}
    </>
  );

  const clearButton = active && onClear && (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClear();
        setOpen(false);
      }}
      aria-label={`Скинути фільтр ${label}`}
      className="ml-0.5 flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="size-3" />
    </button>
  );

  if (!options || options.length === 0) {
    return (
      <div className="flex items-center">
        <button type="button" onClick={onClick} aria-pressed={active} className={triggerCls}>
          {triggerContent}
        </button>
        {clearButton}
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className={triggerCls}>{triggerContent}</PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="w-48 p-1.5"
        >
          <div className="space-y-px">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onSelect?.(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    isSelected
                      ? "bg-primary/8 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  {opt.color && (
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {clearButton}
    </div>
  );
}

// ── AdminTablePanel ───────────────────────────────────────────────────────────

export function AdminTablePanel({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border bg-card", className)}>
      {children}
    </div>
  );
}

// ── AdminSection ──────────────────────────────────────────────────────────────

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: React.PropsWithChildren<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}>) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ── AdminCardGrid ─────────────────────────────────────────────────────────────

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

// ── AdminFormRow ──────────────────────────────────────────────────────────────

export function AdminFormRow({
  label,
  description,
  children,
  required,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-start">
      <div className="pt-2.5">
        <p className="text-sm font-medium">{label}{required && <span className="text-destructive ml-0.5">*</span>}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ── AdminEmptyState ───────────────────────────────────────────────────────────

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="size-10 text-muted-foreground/30 mb-3" />}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

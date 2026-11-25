"use client";

import * as React from "react";
import { ArrowUpDown, Check, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
        "flex min-h-14 shrink-0 flex-wrap items-center gap-2 px-4 py-3 md:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── AdminSearch ───────────────────────────────────────────────────────────────

export function AdminSearch({
  className,
  placeholder = "Пошук...",
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 min-h-0 rounded-lg bg-background pl-9 text-sm md:text-sm"
        {...props}
      />
    </div>
  );
}

// ── AdminFilter ───────────────────────────────────────────────────────────────
// Faceted filter chip (shadcn data-table pattern), single choice:
//  - inactive: dashed outline "+ Статус"
//  - active:   solid chip "Статус | Новий"
// The popover lists options with a check on the chosen one and a "Скинути" row.
// An option with value "all" is treated as "no filter" and is not listed.

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
  options?: FilterOption[];
  onSelect?: (value: string) => void;
  /** Resets this filter (also offered inside the popover). */
  onClear?: () => void;
  /** Toggle chips without options (e.g. "Лише непрочитані"). */
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
  const choices = React.useMemo(() => (options ?? []).filter((o) => o.value !== "all"), [options]);
  const selected = value && value !== "all" ? choices.find((o) => o.value === value) : undefined;
  const isActive = active ?? Boolean(selected);

  const triggerCls = cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isActive
      ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
      : "border-dashed border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground"
  );

  const content = (
    <>
      {isActive ? (
        Icon ? <Icon className="size-4 shrink-0 text-primary" /> : null
      ) : (
        <Plus className="size-4 shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
      {selected && (
        <>
          <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />
          {selected.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} aria-hidden="true" />}
          <span className="max-w-[140px] truncate font-semibold text-primary">{selected.label}</span>
        </>
      )}
    </>
  );

  if (!choices.length) {
    return (
      <button type="button" onClick={onClick} aria-pressed={isActive} className={triggerCls}>
        {content}
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerCls} aria-label={selected ? `${label}: ${selected.label}` : `Фільтр: ${label}`}>
        {content}
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={6} className="w-56 p-1">
        <div role="listbox" aria-label={label} className="max-h-72 overflow-y-auto">
          {choices.map((opt) => {
            const isSelected = selected?.value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onSelect?.(opt.value); setOpen(false); }}
                className={cn(
                  "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors hover:bg-muted",
                  isSelected && "font-medium text-primary",
                )}
              >
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                  {isSelected && <Check className="size-3" />}
                </span>
                {opt.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: opt.color }} aria-hidden="true" />}
                <span className="flex-1 truncate text-left">{opt.label}</span>
              </button>
            );
          })}
        </div>
        {isActive && onClear && (
          <>
            <div className="-mx-1 my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => { onClear(); setOpen(false); }}
              className="flex min-h-9 w-full items-center justify-center rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Скинути
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Sort control: always shows the current order; sorting is not a filter, so it never shows as "active". */
export function AdminSort({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`Сортування: ${current?.label ?? ""}`}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowUpDown className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-muted-foreground">Сортування:</span>
        <span>{current?.label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" side="bottom" sideOffset={6} className="w-52 p-1">
        <div role="listbox" aria-label="Сортування">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === current?.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn("flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm hover:bg-muted", o.value === current?.value && "font-medium text-primary")}
            >
              <span className="flex-1 text-left">{o.label}</span>
              {o.value === current?.value && <Check className="size-4" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** "Скинути фільтри" — shown only while at least one filter is active. */
export function AdminFilterReset({ active, onReset }: { active: boolean; onReset: () => void }) {
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      Скинути
      <X className="size-3.5" aria-hidden="true" />
    </button>
  );
}

// ── AdminTablePanel ───────────────────────────────────────────────────────────

/** Edge padding so the first/last column lines up with the page's px-4 / md:px-6. */
const TABLE_EDGE =
  "[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4 md:[&_th:first-child]:pl-6 md:[&_td:first-child]:pl-6 md:[&_th:last-child]:pr-6 md:[&_td:last-child]:pr-6";

/**
 * Container for admin data.
 * - Default: a bordered card, for key/value panels on detail pages.
 * - `fullWidth`: a data table with no card — only top/bottom rules, columns aligned to the page edge.
 *   Add `bleed` when the parent has the standard page padding (px-4 md:px-6) so the table spans edge to edge.
 */
export function AdminTablePanel({
  children,
  className,
  fullWidth,
  bleed,
}: React.PropsWithChildren<{ className?: string; fullWidth?: boolean; bleed?: boolean }>) {
  if (fullWidth || bleed) {
    return (
      <div className={cn("border-y border-border bg-background", TABLE_EDGE, bleed && "-mx-4 md:-mx-6", className)}>
        {children}
      </div>
    );
  }
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-background", className)}>
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

// ── AdminTableSkeletonRows ───────────────────────────────────────────────────
// Skeleton rows that sit inside a real <TableBody>, so headers stay put while loading.

export function AdminTableSkeletonRows({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="h-14 border-b border-border last:border-0" aria-hidden="true">
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-3">
              <Skeleton className={cn("h-3.5", c === 0 ? "w-32" : c === cols - 1 ? "ml-auto w-12" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── TableSkeleton ─────────────────────────────────────────────────────────────
// Matches AdminTablePanel style: rounded-lg border border-border bg-card

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 8, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Toolbar */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4 md:px-6">
        <Skeleton className="h-8 w-48 rounded-md" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>

      {/* Table header */}
      <div
        className="grid border-b border-border bg-muted/30 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20 rounded" />
        ))}
      </div>

      {/* Table rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="grid items-center px-4 py-3.5"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={cn(
                  "h-4 rounded",
                  colIdx === 0 ? "w-32" : colIdx === columns - 1 ? "w-16" : "w-24"
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <Skeleton className="h-4 w-32 rounded" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ── CardGridSkeleton ──────────────────────────────────────────────────────────

const colsMap: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
};

interface CardGridSkeletonProps {
  cards?: number;
  cols?: 1 | 2 | 3;
}

export function CardGridSkeleton({ cards = 6, cols = 3 }: CardGridSkeletonProps) {
  return (
    <div className={cn("grid gap-3", colsMap[cols])}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          {/* Image placeholder */}
          <Skeleton className="aspect-video w-full rounded-none" />

          {/* Content */}
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full rounded" />
              <Skeleton className="h-3.5 w-4/5 rounded" />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── FormSkeleton ──────────────────────────────────────────────────────────────

interface FormSkeletonProps {
  rows?: number;
}

export function FormSkeleton({ rows = 5 }: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-start"
        >
          {/* Label column */}
          <div className="space-y-1.5 pt-2.5">
            <Skeleton className="h-4 w-28 rounded" />
            {/* Occasional description line */}
            {i % 2 === 0 && <Skeleton className="h-3 w-40 rounded" />}
          </div>

          {/* Input column */}
          <div className="space-y-2">
            {i % 3 === 2 ? (
              // Textarea variant every 3rd row
              <Skeleton className="h-24 w-full rounded-md" />
            ) : i % 4 === 3 ? (
              // Select variant
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              // Standard input
              <Skeleton className="h-9 w-full rounded-md" />
            )}
          </div>
        </div>
      ))}

      {/* Submit button */}
      <div className="flex items-center gap-2 border-t border-border pt-6">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ── StatsSkeleton ─────────────────────────────────────────────────────────────

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-card p-5 space-y-3"
        >
          {/* Icon + label row */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="size-8 rounded-md" />
          </div>

          {/* Main value */}
          <Skeleton className="h-8 w-28 rounded" />

          {/* Change badge */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3.5 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── KanbanSkeleton ────────────────────────────────────────────────────────────

const KANBAN_COLUMNS = 5;
const CARDS_PER_COLUMN = [3, 5, 2, 4, 3] as const;

export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: KANBAN_COLUMNS }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-1 py-0.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>

          {/* Cards */}
          <div className="space-y-2">
            {Array.from({ length: CARDS_PER_COLUMN[colIdx] }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-md border border-border bg-card p-3 space-y-2.5"
              >
                {/* Card title */}
                <Skeleton className="h-4 w-full rounded" />
                {cardIdx % 2 === 0 && <Skeleton className="h-4 w-4/5 rounded" />}

                {/* Labels row */}
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-12 rounded-full" />
                  {cardIdx % 3 !== 0 && <Skeleton className="h-5 w-16 rounded-full" />}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex -space-x-1">
                    <Skeleton className="size-6 rounded-full ring-2 ring-card" />
                    {cardIdx % 2 === 0 && (
                      <Skeleton className="size-6 rounded-full ring-2 ring-card" />
                    )}
                  </div>
                  <Skeleton className="h-3.5 w-12 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Add card button */}
          <Skeleton className="mt-1 h-8 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

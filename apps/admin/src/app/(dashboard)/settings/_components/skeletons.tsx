import { Skeleton } from "@/components/ui/skeleton";

/** Settings card with labeled inputs — profile/security tabs */
export function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows * 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-36 rounded-full" />
    </div>
  );
}

/** Settings card with toggle rows — notifications/system/integrations */
export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level fallback shared by all dashboard pages: a header bar and list rows,
 * the shape most admin screens have, so the swap to real content does not jump.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Завантаження">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 md:px-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64 max-w-[50vw]" />
        </div>
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
      <div className="divide-y px-4 md:px-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="hidden h-3.5 w-32 md:block" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

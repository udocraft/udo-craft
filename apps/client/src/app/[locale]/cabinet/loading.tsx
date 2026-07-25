export default function CabinetLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page title skeleton */}
        <div className="h-8 w-56 bg-muted animate-pulse rounded mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar — order list skeleton */}
          <div className="md:col-span-1 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
              </div>
            ))}
          </div>

          {/* Detail panel skeleton */}
          <div className="md:col-span-2 rounded-xl border border-border p-6 space-y-6">
            {/* Order header */}
            <div className="space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            </div>

            {/* Order items */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-muted animate-pulse rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-4 border-t border-border flex justify-between">
              <div className="h-5 bg-muted animate-pulse rounded w-24" />
              <div className="h-5 bg-muted animate-pulse rounded w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

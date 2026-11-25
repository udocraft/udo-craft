export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero section skeleton */}
        <div className="mb-12 space-y-4">
          <div className="h-12 w-64 bg-muted animate-pulse rounded mb-4" />
          <div className="h-6 w-full max-w-2xl bg-muted animate-pulse rounded" />
        </div>

        {/* Categories skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-muted animate-pulse rounded mb-4" />
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>

        {/* Products grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden border border-border">
              {/* Image placeholder */}
              <div className="aspect-square bg-muted animate-pulse" />
              {/* Content placeholder */}
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-8 bg-muted animate-pulse rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
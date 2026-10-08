import { Skeleton } from '@/components/ui/skeleton';

export function DashboardHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-40" />
    </div>
  );
}

export function DashboardKpiGridSkeleton({
  count = 4,
  gridClassName = 'grid grid-cols-2 lg:grid-cols-4 gap-4',
}: {
  count?: number;
  gridClassName?: string;
}) {
  return (
    <div className={gridClassName}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function DashboardTableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="space-y-2">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, idx) => (
            <Skeleton key={`header-${idx}`} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={`row-${rowIdx}`} className="grid gap-3 py-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, cellIdx) => (
              <Skeleton key={`cell-${rowIdx}-${cellIdx}`} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

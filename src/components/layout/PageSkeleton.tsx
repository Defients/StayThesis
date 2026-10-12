/** Suspense fallback for lazily loaded routes. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="animate-pulse">
      <div className="mb-2 h-3 w-10 rounded bg-elevated" />
      <div className="mb-2 h-8 w-64 rounded bg-elevated" />
      <div className="mb-8 h-4 w-96 max-w-full rounded bg-elevated" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-xl border border-line bg-surface" />
    </div>
  );
}

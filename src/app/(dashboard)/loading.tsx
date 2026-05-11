export default function DashboardLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-8 pb-32 w-full">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="skeleton skeleton-text-lg w-48 mb-3" />
        <div className="skeleton skeleton-text w-72" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton skeleton-card h-32" />
        ))}
      </div>

      {/* Content cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container">
            <div className="flex items-center gap-4 mb-4">
              <div className="skeleton skeleton-avatar w-10 h-10" />
              <div className="flex-1 space-y-2">
                <div className="skeleton skeleton-text w-3/4" />
                <div className="skeleton skeleton-text-sm w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="skeleton skeleton-text w-full" />
              <div className="skeleton skeleton-text w-5/6" />
              <div className="skeleton skeleton-text w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}

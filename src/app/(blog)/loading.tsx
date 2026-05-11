export default function BlogLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Hero skeleton */}
      <div className="skeleton skeleton-card w-full h-64 md:h-80 mb-8" />

      {/* Category chips */}
      <div className="flex gap-2 mb-8 overflow-hidden">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton h-8 w-20 rounded-full shrink-0" />
        ))}
      </div>

      {/* Article grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container">
            <div className="skeleton w-full h-44" style={{ borderRadius: 0 }} />
            <div className="p-4 space-y-3">
              <div className="skeleton skeleton-text-sm w-16" />
              <div className="skeleton skeleton-text-lg w-full" />
              <div className="skeleton skeleton-text w-5/6" />
              <div className="flex items-center gap-2 pt-2">
                <div className="skeleton skeleton-avatar w-6 h-6" />
                <div className="skeleton skeleton-text-sm w-24" />
                <div className="skeleton skeleton-text-sm w-16 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

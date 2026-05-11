export default function AdminLoading() {
  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="mb-10">
        <div className="skeleton h-6 w-20 rounded-full mb-3" />
        <div className="skeleton skeleton-text-lg w-56 h-8 mb-2" />
        <div className="skeleton skeleton-text w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton skeleton-card h-24" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-surface-container-low p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-surface-container-low last:border-0">
              <div className="skeleton skeleton-avatar w-9 h-9" />
              <div className="flex-1 space-y-2">
                <div className="skeleton skeleton-text w-48" />
                <div className="skeleton skeleton-text-sm w-32" />
              </div>
              <div className="skeleton h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

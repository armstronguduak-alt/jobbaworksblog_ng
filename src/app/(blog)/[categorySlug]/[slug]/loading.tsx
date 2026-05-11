export default function ArticleLoading() {
  return (
    <article className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-32">
      {/* Category badge */}
      <div className="mb-6">
        <div className="skeleton h-6 w-24 rounded-full mb-4" />
        {/* Title */}
        <div className="space-y-3 mb-6">
          <div className="skeleton skeleton-text-lg w-full h-8" />
          <div className="skeleton skeleton-text-lg w-4/5 h-8" />
        </div>
        {/* Tags */}
        <div className="flex gap-2 mb-6">
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-20 rounded-full" />
        </div>
        {/* Author row */}
        <div className="flex items-center gap-4 py-4 border-y border-slate-100">
          <div className="skeleton skeleton-avatar w-12 h-12" />
          <div className="space-y-2 flex-1">
            <div className="skeleton skeleton-text w-32" />
            <div className="skeleton skeleton-text-sm w-20" />
          </div>
          <div className="skeleton skeleton-text-sm w-28" />
        </div>
      </div>

      {/* Featured image */}
      <div className="skeleton w-full h-64 md:h-96 rounded-3xl mb-12" />

      {/* Article body lines */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
          <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
        <div className="h-4" />
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton skeleton-text" style={{ width: `${55 + Math.random() * 45}%` }} />
        ))}
      </div>
    </article>
  )
}

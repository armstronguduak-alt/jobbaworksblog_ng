import { fetchArticleFeed } from '@/lib/data/articles'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const { categories, featuredPosts, latestPosts } = await fetchArticleFeed()

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#002110] via-[#003920] to-[#006b3f] overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white font-headline leading-tight mb-4">
              Read. Earn.<br />Grow.
            </h1>
            <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              Your daily platform for professional growth and passive earnings. Explore quality articles and start earning today.
            </p>
            <div className="flex gap-3">
              <Link href="/signup" className="bg-white text-primary hover:bg-surface-container-lowest transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-xl active:scale-95 duration-200">
                Get Started
              </Link>
              <Link href="/login" className="bg-transparent border-2 border-white/30 text-white hover:bg-white/10 transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg backdrop-blur-sm">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      {featuredPosts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
          <h2 className="text-2xl font-black font-headline text-on-surface mb-6">
            <span className="material-symbols-outlined text-primary mr-2 align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            Featured
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredPosts.slice(0, 3).map((post: any) => (
              <Link key={post.id} href={`/${post.category?.slug || 'post'}/${post.slug}`} className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow border border-surface-container">
                {post.cover_image && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                  {post.category?.name && (
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{post.category.name}</span>
                  )}
                  <h3 className="text-base font-bold text-on-surface mt-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-on-surface-variant">
                    <span>{post.author?.name || 'Anonymous'}</span>
                    <span>·</span>
                    <span>{post.read_time || 3} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <span className="shrink-0 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold">All Feed</span>
          {categories.map((cat: any) => (
            <Link key={cat.id} href={`/${cat.slug}`} className="shrink-0 px-4 py-2 bg-surface-container rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-high transition-colors">{cat.name}</Link>
          ))}
        </div>
      </section>

      {/* Latest Articles */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <h2 className="text-2xl font-black font-headline text-on-surface mb-6">Latest Articles</h2>
        <div className="space-y-4">
          {latestPosts.map((post: any) => (
            <Link key={post.id} href={`/${post.category?.slug || 'post'}/${post.slug}`} className="group flex gap-4 bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container hover:shadow-md transition-shadow p-3">
              {post.cover_image && (
                <div className="w-[120px] h-[90px] shrink-0 rounded-xl overflow-hidden">
                  <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {post.category?.name && (
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{post.category.name}</span>
                )}
                <h3 className="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors mt-0.5">{post.title}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                  <span>{post.author?.name || 'Anonymous'}</span>
                  <span>·</span>
                  <span>{post.read_time || 3} min</span>
                  <span>·</span>
                  <span>{post.views || 0} views</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {latestPosts.length === 0 && (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">article</span>
            <p className="text-on-surface-variant font-medium">No articles yet. Check back soon!</p>
          </div>
        )}
      </section>
    </main>
  )
}

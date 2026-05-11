import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchArticlesByCategory } from '@/lib/data/articles'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}): Promise<Metadata> {
  const { categorySlug } = await params
  const { category } = await fetchArticlesByCategory(categorySlug)

  if (!category) return { title: 'Category Not Found' }

  return {
    title: `${category.name} Articles`,
    description: `Browse the latest ${category.name} articles on JobbaWorks.`,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}) {
  const { categorySlug } = await params
  const { category, posts } = await fetchArticlesByCategory(categorySlug)

  if (!category) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Category Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/" className="text-xs text-on-surface-variant hover:text-primary transition-colors font-medium">Home</Link>
          <span className="text-xs text-on-surface-variant">/</span>
          <span className="text-xs text-primary font-bold">{category.name}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black font-headline text-on-surface">
          {category.name}
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          {posts.length} article{posts.length !== 1 ? 's' : ''} in this category
        </p>
      </div>

      {/* Articles Grid */}
      {posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={`/${post.category?.slug || categorySlug}/${post.slug}`}
              className="group flex gap-4 bg-surface-container-lowest rounded-2xl overflow-hidden border border-surface-container hover:shadow-md transition-shadow p-3"
            >
              {post.cover_image && (
                <div className="w-[120px] h-[90px] shrink-0 rounded-xl overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-on-surface-variant">
                  <span>{post.author?.name || 'Anonymous'}</span>
                  <span>·</span>
                  <span>{post.read_time || 3} min read</span>
                  <span>·</span>
                  <span>{post.views || 0} views</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-outline mb-3">article</span>
          <p className="text-on-surface-variant font-medium">No articles in this category yet.</p>
        </div>
      )}
    </div>
  )
}

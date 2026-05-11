import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { fetchArticleBySlug, fetchRelatedArticles, fetchAllArticleSlugs } from '@/lib/data/articles'
import { ArticleEngagement } from '@/components/client/ArticleEngagement'

// ISR: Revalidate every 60 seconds
export const revalidate = 60

// Pre-render top articles at build time
export async function generateStaticParams() {
  const slugs = await fetchAllArticleSlugs()
  return slugs.map(({ slug, categorySlug }) => ({
    categorySlug,
    slug,
  }))
}

// Server-side metadata generation for SEO + Open Graph
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchArticleBySlug(slug)

  if (!post) {
    return { title: 'Article Not Found' }
  }

  const excerpt = post.excerpt || post.title
  const ogImage = post.cover_image || post.featured_image

  return {
    title: post.title,
    description: excerpt,
    openGraph: {
      title: post.title,
      description: excerpt,
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: [post.author?.name || 'JobbaWorks'],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: excerpt,
      images: ogImage ? [ogImage] : [],
    },
  }
}

// ── Main Article Page (Server Component) ──
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ categorySlug: string; slug: string }>
}) {
  const { slug, categorySlug } = await params
  const post = await fetchArticleBySlug(slug)

  if (!post) {
    notFound()
  }

  // Fetch related articles in parallel
  const relatedPosts = post.category_id
    ? await fetchRelatedArticles(post.category_id, post.id)
    : []

  const content = post.content || ''

  return (
    <>
      {/* JSON-LD Structured Data — server-rendered for crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.excerpt || post.title,
            image: post.cover_image || post.featured_image,
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            author: {
              '@type': 'Person',
              name: post.author?.name || 'JobbaWorks',
              url: `https://jobbaworks.com/author/${post.author?.username}`,
            },
            publisher: {
              '@type': 'Organization',
              name: 'JobbaWorks',
              logo: { '@type': 'ImageObject', url: 'https://jobbaworks.com/logo.png' },
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://jobbaworks.com/${categorySlug}/${slug}`,
            },
          }),
        }}
      />

      <article className="max-w-4xl mx-auto px-4 md:px-6 pt-8 md:pt-12 pb-32 relative">
        {/* Category Badge */}
        <div className="mb-6">
          {post.category && (
            <Link
              href={`/${post.category.slug}`}
              className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-4 hover:bg-emerald-200 transition-colors"
            >
              {post.category.name}
            </Link>
          )}

          {/* Title — Server-rendered, instantly visible, SEO-crawlable */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black font-headline text-slate-900 leading-tight mb-4">
            {post.title}
          </h1>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              {post.category?.name || 'Topic'}
            </span>
            <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              JobbaWorks
            </span>
          </div>

          {/* Author Card — Server-rendered */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-slate-100">
            <Link href={`/author/${post.author?.username || post.author?.user_id}`} className="flex items-center gap-4 group">
              <img
                src={post.author?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${post.author?.name}`}
                className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:ring-2 ring-primary transition-all"
                loading="eager"
                alt={post.author?.name || 'Author'}
              />
              <div>
                <p className="font-bold text-slate-900 flex items-center gap-1 group-hover:text-primary transition-colors">
                  {post.author?.name || 'Unknown Author'}
                </p>
                <p className="text-xs text-slate-500 font-medium">@{post.author?.username || 'user'}</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <span className="text-sm font-bold text-slate-400">
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-sm font-bold text-slate-400">
                • {post.read_time || Math.ceil((post.reading_time_seconds || 180) / 60)} min read
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {(post.cover_image || post.featured_image) && (
          <div className="w-full mb-12 rounded-3xl overflow-hidden shadow-lg border border-surface-container-low">
            <img
              src={post.cover_image || post.featured_image}
              alt={post.title}
              className="w-full h-auto object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Summary/Excerpt */}
        {post.summary && (
          <div className="text-xl font-medium text-slate-600 mb-10 leading-relaxed border-l-4 border-primary pl-6">
            {post.summary}
          </div>
        )}

        {/* Article Body — Server-rendered HTML content, zero hydration */}
        <div
          className="prose prose-sm md:prose-base article-content max-w-none prose-emerald prose-headings:font-headline mb-12 whitespace-pre-wrap text-slate-800 leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Client Island: Engagement (likes, follow, share, view tracking, comments) */}
        <ArticleEngagement
          postId={post.id}
          postSlug={post.slug}
          authorUserId={post.author?.user_id || post.author_user_id}
          authorUsername={post.author?.username}
          categorySlug={categorySlug}
        />

        {/* Related Articles — Server-rendered */}
        {relatedPosts.length > 0 && (
          <section className="mt-16 pt-8 border-t border-slate-100">
            <h2 className="text-xl font-black font-headline text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>recommend</span>
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPosts.slice(0, 4).map((rp: any) => (
                <Link
                  key={rp.id}
                  href={`/${rp.category?.slug || categorySlug}/${rp.slug}`}
                  className="group flex gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-surface-container hover:shadow-md transition-shadow"
                >
                  {rp.cover_image && (
                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden">
                      <img src={rp.cover_image} alt={rp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                      {rp.title}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {rp.read_time || 3} min read • {rp.views || 0} views
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  )
}

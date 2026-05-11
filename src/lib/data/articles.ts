import { createClient } from '@/lib/supabase/server'

/**
 * Fetch the full article feed for the home page.
 * Server-side only — called from Server Components.
 */
export async function fetchArticleFeed() {
  const supabase = await createClient()

  const [categoriesRes, featuredRes, latestRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .order('name'),
    supabase
      .from('posts')
      .select(`
        id, title, slug, excerpt, cover_image, views, likes, read_time,
        is_featured, created_at, published_at,
        category:categories(id, name, slug),
        author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url)
      `)
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(5),
    supabase
      .from('posts')
      .select(`
        id, title, slug, excerpt, cover_image, views, likes, read_time,
        is_featured, created_at, published_at,
        category:categories(id, name, slug),
        author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url)
      `)
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .limit(50),
  ])

  return {
    categories: (categoriesRes.data || []) as any[],
    featuredPosts: (featuredRes.data || []) as any[],
    latestPosts: (latestRes.data || []) as any[],
  }
}

/**
 * Fetch a single article by slug — the most SEO-critical fetch.
 * Used for ISR article pages.
 */
export async function fetchArticleBySlug(slug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      category:categories(id, name, slug),
      author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url)
    `)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single()

  if (error || !data) return null
  return data as any
}

/**
 * Fetch articles by category slug.
 */
export async function fetchArticlesByCategory(categorySlug: string) {
  const supabase = await createClient()

  // First get the category
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', categorySlug)
    .single()

  if (!category) return { category: null, posts: [] }

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image, views, likes, read_time,
      is_featured, created_at, published_at,
      category:categories(id, name, slug),
      author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url)
    `)
    .eq('status', 'approved')
    .eq('category_id', category.id)
    .order('published_at', { ascending: false })
    .limit(50)

  return {
    category: category as any,
    posts: (posts || []) as any[],
  }
}

/**
 * Fetch related articles for an article page.
 */
export async function fetchRelatedArticles(categoryId: string, excludeId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image, views, read_time, created_at,
      category:categories(id, name, slug),
      author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url)
    `)
    .eq('status', 'approved')
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .order('published_at', { ascending: false })
    .limit(4)

  return (data || []) as any[]
}

/**
 * Fetch all approved article slugs for generateStaticParams.
 */
export async function fetchAllArticleSlugs() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('posts')
    .select('slug, category:categories(slug)')
    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(200)

  return (data || []).map((p: any) => ({
    slug: p.slug,
    categorySlug: p.category?.slug || 'post',
  }))
}

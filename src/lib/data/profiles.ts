import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'

/**
 * Fetch a public profile by username.
 */
export async function fetchPublicProfile(username: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, username, name, avatar_url, bio, created_at')
    .eq('username', username)
    .single()

  if (error || !data) return null
  return data as Pick<Profile, 'user_id' | 'username' | 'name' | 'avatar_url' | 'bio' | 'created_at'>
}

/**
 * Fetch articles by a specific author.
 */
export async function fetchAuthorArticles(userId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('posts')
    .select(`
      id, title, slug, excerpt, cover_image, views, likes, read_time,
      created_at, published_at,
      category:categories(id, name, slug)
    `)
    .eq('author_user_id', userId)
    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(20)

  return data || []
}

/**
 * Fetch author follower count.
 */
export async function fetchAuthorFollowerCount(userId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_user_id', userId)

  return count || 0
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Build-time Supabase client — does NOT use cookies.
 * Used in generateStaticParams and other build-time functions
 * where there is no HTTP request context.
 */
export function createBuildClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

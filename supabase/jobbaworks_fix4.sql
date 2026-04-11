-- =========================================================
-- JOBBAWORKS: FIX MISSING POST ANALYTICS COLUMNS
-- Run this in your Supabase SQL Editor!
-- =========================================================

-- 1. Add the missing analytics columns to the posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reads integer NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS earnings numeric NOT NULL DEFAULT 0;

-- 2. Re-create the RPC function to ensure it binds to the newly added views column safely
CREATE OR REPLACE FUNCTION public.increment_view_count(post_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET views = COALESCE(views, 0) + 1
  WHERE slug = post_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(text) TO anon, authenticated;

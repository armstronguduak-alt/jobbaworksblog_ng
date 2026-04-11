-- =========================================================
-- JOBBAWORKS: FIX ARTICLE VIEWS REGISTRATION
-- Run this in your Supabase SQL Editor to enable View counts!
-- =========================================================

-- 1. Create a secure RPC function to safely bypass Public updating restrictions
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

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.increment_view_count(text) TO anon, authenticated;

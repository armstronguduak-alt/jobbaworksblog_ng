CREATE TABLE IF NOT EXISTS public.post_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    user_views INTEGER NOT NULL DEFAULT 0,
    anonymous_views INTEGER NOT NULL DEFAULT 0,
    UNIQUE(post_id, date)
);

CREATE INDEX IF NOT EXISTS idx_post_analytics_daily_post_date ON public.post_analytics_daily(post_id, date);
CREATE INDEX IF NOT EXISTS idx_post_analytics_daily_date ON public.post_analytics_daily(date);

-- Enable RLS
ALTER TABLE public.post_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if they exist
DROP POLICY IF EXISTS "Admins can read all analytics" ON public.post_analytics_daily;
DROP POLICY IF EXISTS "Authors can read analytics for their posts" ON public.post_analytics_daily;

-- Admins can read all
CREATE POLICY "Admins can read all analytics" ON public.post_analytics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role IN ('admin', 'superadmin', 'moderator'))
  );

-- Authors can read their own post's analytics
CREATE POLICY "Authors can read analytics for their posts" ON public.post_analytics_daily
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_analytics_daily.post_id AND posts.author_user_id = auth.uid())
  );

-- RPC for incrementing views efficiently
CREATE OR REPLACE FUNCTION public.increment_post_view(p_post_id UUID, p_is_user BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.post_analytics_daily (post_id, date, user_views, anonymous_views)
    VALUES (
        p_post_id, 
        CURRENT_DATE, 
        CASE WHEN p_is_user THEN 1 ELSE 0 END, 
        CASE WHEN p_is_user THEN 0 ELSE 1 END
    )
    ON CONFLICT (post_id, date) 
    DO UPDATE SET 
        user_views = public.post_analytics_daily.user_views + (CASE WHEN p_is_user THEN 1 ELSE 0 END),
        anonymous_views = public.post_analytics_daily.anonymous_views + (CASE WHEN p_is_user THEN 0 ELSE 1 END);
END;
$$;

-- =========================================================
-- JOBBAWORKS: REAL-TIME ACTIVATION & CORE POLICIES SCRIPT
-- Run this in your Supabase SQL Editor to instantly fix 
-- realtime UI updates and unlock malfunctioning buttons.
-- =========================================================

-- 1. Completely Reset and Enable the Supabase Real-Time Publication pipeline
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

-- 2. Dynamically attach ALL natively existing public tables to Real-Time 
-- (This actively prevents missing table errors like 'swap_transactions doesn't exist')
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(r.tablename);
        EXCEPTION
            WHEN undefined_table THEN
                -- ignore gracefully
            WHEN duplicate_object THEN
                -- ignore gracefully if already attached
        END;
    END LOOP;
END
$$;

-- =========================================================
-- 2.5 FIX: LEADERBOARD MISSING DATA
-- If users don't have an explicit 'active' status yet, they vanished.
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE (
  rank              bigint,
  user_id           uuid,
  name              text,
  username          text,
  avatar_url        text,
  total_earnings    numeric,
  referral_earnings numeric,
  plan_id           text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
  SELECT
    ROW_NUMBER() OVER (ORDER BY wb.total_earnings DESC),
    p.user_id, p.name, p.username, p.avatar_url,
    wb.total_earnings, wb.referral_earnings,
    COALESCE(us.plan_id::text, 'free')
  FROM public.wallet_balances wb
  JOIN  public.profiles          p  ON p.user_id  = wb.user_id
  LEFT JOIN public.user_subscriptions us ON us.user_id = wb.user_id
  WHERE (p.status = 'active' OR p.status IS NULL)
  ORDER BY wb.total_earnings DESC
  LIMIT _limit;
$func$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;

-- =========================================================
-- 3. ENSURE ALL BUTTONS / ACTIONS FUNCTION PROPERLY (RLS PATCHES)
-- If a button inside the User Dashboard fails, it's typically because 
-- the database implicitly blocks the UPDATE or INSERT permission.
-- =========================================================

-- Fix for Articles (Creation & Editing)
DROP POLICY IF EXISTS "posts_author_insert" ON public.posts;
CREATE POLICY "posts_author_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_user_id);

DROP POLICY IF EXISTS "posts_author_update_safe" ON public.posts;
CREATE POLICY "posts_author_update_safe" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_user_id);

-- Fix for Notifications (Allowing users to mark them as 'Read')
DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fix for Comments (Allowing users to post comments)
DROP POLICY IF EXISTS "comments_insert_own" ON public.post_comments;
CREATE POLICY "comments_insert_own" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Fix for Withdrawals (Users requesting payout)
DROP POLICY IF EXISTS "wr_insert_own_admin" ON public.withdrawal_requests;
CREATE POLICY "wr_insert_own_admin" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- SUCCESS! Real-time WebSockets and Authorizations have been established.
-- =========================================================

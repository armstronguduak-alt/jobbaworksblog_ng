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

-- 2. Explicitly attach all vital tables to the live Real-Time pipeline
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_tasks;

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

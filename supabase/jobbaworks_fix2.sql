-- =========================================================
-- JOBBAWORKS: FINAL RLS FIXES FOR DASHBOARD DATA VISIBILITY
-- Run this in your Supabase SQL Editor!
-- =========================================================

-- Fix for Articles (Users must be able to SELECT their own drafts and pending posts)
DROP POLICY IF EXISTS "posts_author_select" ON public.posts;
CREATE POLICY "posts_author_select" ON public.posts FOR SELECT USING (auth.uid() = author_user_id);

-- Ensure users can see their own referrals
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own" ON public.referrals FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- Ensure users can see their own wallet balances and transactions
DROP POLICY IF EXISTS "tx_select_own" ON public.wallet_transactions;
CREATE POLICY "tx_select_own" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "balances_select_own" ON public.wallet_balances;
CREATE POLICY "balances_select_own" ON public.wallet_balances FOR SELECT USING (auth.uid() = user_id);

-- =========================================================
-- SUCCESS! Authors will now see ALL their pending articles!
-- =========================================================

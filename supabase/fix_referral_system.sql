-- =========================================================
-- JOBBAWORKS REFERRAL SYSTEM COMPLETE FIX
-- Run this in your Supabase SQL Editor
-- =========================================================

-- ─── STEP 1: Populate the `referrals` table from profiles.referred_by_code ────
-- The referrals table is empty because the RPC may not have fired correctly
-- for some users. We use profiles.referred_by_code as the source of truth.

INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code_used)
SELECT
  referrer.user_id AS referrer_user_id,
  referred.user_id AS referred_user_id,
  referred.referred_by_code AS referral_code_used
FROM public.profiles AS referred
JOIN public.profiles AS referrer
  ON (
    referrer.referral_code = referred.referred_by_code
    OR UPPER(referrer.username) = UPPER(referred.referred_by_code)
  )
WHERE referred.referred_by_code IS NOT NULL
  AND referred.user_id <> referrer.user_id
ON CONFLICT (referred_user_id) DO NOTHING;

-- ─── STEP 2: RLS on referrals table ──────────────────────────────────────────
-- Ensure RLS is enabled
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see referrals where they are the referrer OR referred
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own"
ON public.referrals FOR SELECT
TO authenticated
USING (
  auth.uid() = referrer_user_id
  OR auth.uid() = referred_user_id
);

-- Admin can see all
DROP POLICY IF EXISTS "referrals_admin_select_all" ON public.referrals;
CREATE POLICY "referrals_admin_select_all"
ON public.referrals FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert policy (for the RPC / signup flow)
DROP POLICY IF EXISTS "referrals_insert_referred_or_admin" ON public.referrals;
CREATE POLICY "referrals_insert_referred_or_admin"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = referred_user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ─── STEP 3: Add FK from user_subscriptions to profiles (for PostgREST joins) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_subscriptions_user_id_fkey_profiles'
      AND table_name = 'user_subscriptions'
  ) THEN
    ALTER TABLE public.user_subscriptions
      ADD CONSTRAINT user_subscriptions_user_id_fkey_profiles
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- FK already exists, do nothing
  NULL;
END $$;

-- ─── STEP 4: Ensure wallet_transactions RLS allows users to read their own ───
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_tx_select_own" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_select_own"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin can see all transactions
DROP POLICY IF EXISTS "wallet_tx_admin_select_all" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_admin_select_all"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ─── STEP 5: Run the retroactive referral crediting ──────────────────────────
-- Credit referrers for users who purchased plans and have a referred_by_code
DO $$
DECLARE
    r RECORD;
    referrer_record RECORD;
    existing_bonus_count INTEGER;
BEGIN
    FOR r IN
        SELECT p.user_id, p.referred_by_code, p.username, us.plan_id, sp.price
        FROM public.profiles p
        JOIN public.user_subscriptions us ON us.user_id = p.user_id
        JOIN public.subscription_plans sp ON sp.id = us.plan_id
        WHERE p.referred_by_code IS NOT NULL AND us.plan_id IS NOT NULL AND us.plan_id != 'free'
    LOOP
        SELECT * INTO referrer_record
        FROM public.profiles
        WHERE referral_code = r.referred_by_code OR UPPER(username) = UPPER(r.referred_by_code) LIMIT 1;

        IF FOUND THEN
            SELECT COUNT(*) INTO existing_bonus_count
            FROM public.wallet_transactions
            WHERE user_id = referrer_record.user_id
              AND type = 'referral_bonus'
              AND (meta->>'referred_user_id')::TEXT = r.user_id::TEXT;

            IF existing_bonus_count = 0 THEN
                INSERT INTO public.wallet_transactions (
                    user_id, type, amount, status, meta
                ) VALUES (
                    referrer_record.user_id,
                    'referral_bonus',
                    (r.price * 0.25),
                    'completed',
                    jsonb_build_object(
                         'referred_user_id', r.user_id,
                         'referred_username', r.username,
                         'plan_id', r.plan_id
                    )
                );

                UPDATE public.wallet_balances
                SET balance = balance + (r.price * 0.25),
                    referral_earnings = referral_earnings + (r.price * 0.25),
                    total_earnings = total_earnings + (r.price * 0.25)
                WHERE user_id = referrer_record.user_id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ─── DONE ────────────────────────────────────────────────────────────────────
SELECT 'Referral system fix completed successfully!' AS status;

-- =========================================================
-- JOBBAWORKS SUPABASE FIX SCRIPT
-- Run this in your Supabase SQL Editor:
-- Go to: https://supabase.com → Your Project → SQL Editor
-- Paste this entire script and click RUN
-- =========================================================

-- 1. Add missing columns to profiles table (safe if already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- 2. Ensure wallet_balances exists for all current users who don't have one
INSERT INTO public.wallet_balances (user_id, balance, total_earnings, referral_earnings)
SELECT p.user_id, 0, 0, 0
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallet_balances wb WHERE wb.user_id = p.user_id
);

-- 3. Ensure user_roles exists for all current users
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'user'
);

-- 4. Ensure user_subscriptions exists for all current users  
INSERT INTO public.user_subscriptions (user_id, plan_id)
SELECT p.user_id, 'free'::public.plan_id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_subscriptions us WHERE us.user_id = p.user_id
);

-- 5. Make sure the initialize_my_account RPC is up to date
DROP FUNCTION IF EXISTS public.initialize_my_account(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.initialize_my_account(
  _name text,
  _email text,
  _phone text DEFAULT '',
  _username text DEFAULT '',
  _gender text DEFAULT '',
  _avatar_url text DEFAULT '',
  _referred_by_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe_name text := COALESCE(NULLIF(TRIM(_name), ''), 'New User');
  _safe_email text := NULLIF(TRIM(_email), '');
  _safe_phone text := NULLIF(TRIM(_phone), '');
  _safe_username text := NULLIF(TRIM(_username), '');
  _safe_gender text := NULLIF(TRIM(_gender), '');
  _safe_avatar text := NULLIF(TRIM(_avatar_url), '');
  _normalized_ref text := NULLIF(UPPER(TRIM(COALESCE(_referred_by_code, ''))), '');
  _referral_code text;
  _referrer_user_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Generate unique referral code
  LOOP
    _referral_code := UPPER(REGEXP_REPLACE(SUBSTR(_safe_name, 1, 4), '\s+', '', 'g'))
                      || UPPER(SUBSTR(MD5(RANDOM()::text || CLOCK_TIMESTAMP()::text), 1, 4));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.referral_code = _referral_code
    );
  END LOOP;

  -- Upsert profile
  INSERT INTO public.profiles (
    user_id, email, name, username, gender, phone, avatar_url,
    bio, referral_code, referred_by_code
  )
  VALUES (
    _uid, _safe_email, _safe_name, _safe_username, _safe_gender, _safe_phone,
    COALESCE(_safe_avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || ENCODE(_safe_name::bytea, 'escape')),
    'JobbaWorks Member', _referral_code, _normalized_ref
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email        = COALESCE(EXCLUDED.email, profiles.email),
        name         = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
        username     = COALESCE(NULLIF(EXCLUDED.username, ''), profiles.username),
        gender       = COALESCE(NULLIF(EXCLUDED.gender, ''), profiles.gender),
        phone        = COALESCE(EXCLUDED.phone, profiles.phone),
        avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        referred_by_code = COALESCE(profiles.referred_by_code, EXCLUDED.referred_by_code),
        updated_at   = NOW();

  -- Ensure user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure subscription
  INSERT INTO public.user_subscriptions (user_id, plan_id)
  VALUES (_uid, 'free'::public.plan_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure wallet
  INSERT INTO public.wallet_balances (user_id, balance, total_earnings, referral_earnings)
  VALUES (_uid, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Handle referral linkage
  IF _normalized_ref IS NOT NULL THEN
    SELECT p.user_id INTO _referrer_user_id
    FROM public.profiles p
    WHERE (p.referral_code = _normalized_ref OR UPPER(p.username) = _normalized_ref)
      AND p.user_id <> _uid
    LIMIT 1;

    IF _referrer_user_id IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, referral_code_used)
      VALUES (_referrer_user_id, _uid, _normalized_ref)
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_my_account(text, text, text, text, text, text, text) TO authenticated;

-- 6. Fix RLS on wallet_balances so users can see their own wallet
DROP POLICY IF EXISTS "wallet_balances_select_own" ON public.wallet_balances;
CREATE POLICY "wallet_balances_select_own"
ON public.wallet_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_balances_insert_own" ON public.wallet_balances;
CREATE POLICY "wallet_balances_insert_own"
ON public.wallet_balances FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wallet_balances_update_own" ON public.wallet_balances;
CREATE POLICY "wallet_balances_update_own"
ON public.wallet_balances FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 7. Fix RLS on user_tasks table
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tasks_select_own" ON public.user_tasks;
CREATE POLICY "user_tasks_select_own"
ON public.user_tasks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tasks_insert_own" ON public.user_tasks;
CREATE POLICY "user_tasks_insert_own"
ON public.user_tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_tasks_update_own" ON public.user_tasks;
CREATE POLICY "user_tasks_update_own"
ON public.user_tasks FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 8. Fix tasks table RLS (public read since tasks are for everyone)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_public_read" ON public.tasks;
CREATE POLICY "tasks_public_read"
ON public.tasks FOR SELECT
TO authenticated
USING (status = 'active');

-- 9. system_settings: allow authenticated users to read (fixes 406 error)
DROP POLICY IF EXISTS "system_settings_authenticated_read" ON public.system_settings;
CREATE POLICY "system_settings_authenticated_read"
ON public.system_settings FOR SELECT
TO authenticated
USING (true);

-- 10. profiles: allow authenticated users to read ALL profiles
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 10b. FIX: Allow authors to see their own drafts, and everyone to see approved posts
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT TO authenticated
USING (status = 'approved' OR auth.uid() = author_user_id);


-- 11. Add FK from posts.author_user_id to profiles.user_id (enables Supabase join syntax)
ALTER TABLE public.posts 
  DROP CONSTRAINT IF EXISTS posts_author_user_id_fkey;
ALTER TABLE public.posts 
  ADD CONSTRAINT posts_author_user_id_fkey 
  FOREIGN KEY (author_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- 12. Ensure monetization_rate exists to prevent 406 error on .single()
INSERT INTO public.system_settings (key, value, is_public)
VALUES ('monetization_rate', '{"rate": 100}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- 13. Ensure page_toggles exists to prevent 406 error on .single()
INSERT INTO public.system_settings (key, value, is_public)
VALUES ('page_toggles', '{"swapEnabled": true, "walletEnabled": true, "earningsEnabled": true, "promotionsEnabled": true, "referralsEnabled": true, "leaderboardEnabled": true}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- 14. Establish Missing Foreign Keys for PostgREST Relational Joins
ALTER TABLE public.wallet_balances DROP CONSTRAINT IF EXISTS wallet_balances_user_id_fkey;
ALTER TABLE public.wallet_balances ADD CONSTRAINT wallet_balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_user_id_fkey;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 15. Enable Supabase Realtime for Dynamic Functionality
BEGIN;
  DO $$ 
  BEGIN 
    -- Only try adding if not already in publication
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallet_balances') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_balances;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'referrals') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallet_transactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
    END IF;
  END $$;
COMMIT;

-- 16. Ensure "post_images" Bucket Exists for Inline/Featured Images
INSERT INTO storage.buckets (id, name, public, "file_size_limit", "allowed_mime_types")
VALUES ('post_images', 'post_images', true, 5242880, '{"image/*"}'::text[])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "post_images_read" ON storage.objects;
CREATE POLICY "post_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'post_images');

DROP POLICY IF EXISTS "post_images_insert" ON storage.objects;
CREATE POLICY "post_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post_images');

DROP POLICY IF EXISTS "post_images_update" ON storage.objects;
CREATE POLICY "post_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'post_images' AND auth.uid() = owner);

DROP POLICY IF EXISTS "post_images_delete" ON storage.objects;
CREATE POLICY "post_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'post_images' AND auth.uid() = owner);

-- Done!
SELECT 'JobbaWorks Referral, Realtime & Image Fix Script Completed Successfully!' as status;

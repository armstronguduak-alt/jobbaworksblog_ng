-- =========================================================
-- JOBBAWORKS: COMPLETE PAGES SQL MIGRATION
-- Covers all 26 pages: User Dashboard + Admin + Public
-- Generated: 2026-04-01
--
-- IMPORTANT: Run complete_schema.sql FIRST on a fresh database.
-- This file adds new columns, tables, views and RPCs on top.
-- All ALTER TABLE statements are wrapped in safe DO blocks.
-- =========================================================

-- =========================================================
-- SECTION 1: MISSING COLUMNS ON EXISTING TABLES (safe)
-- =========================================================

-- posts: view/read/earnings counters used by Analytics page
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views    INTEGER       NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reads    INTEGER       NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS earnings NUMERIC(12,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_story               BOOLEAN DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS author_earnings_claimed BOOLEAN DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS seo_meta_title         TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS seo_meta_description   TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- wallet_balances: post_earnings for author monetization
DO $$ BEGIN
  ALTER TABLE public.wallet_balances ADD COLUMN IF NOT EXISTS post_earnings NUMERIC(12,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- profiles: username, gender, payout_pin
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username   TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender     TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_pin TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
-- add unique constraint on username separately (safe)
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN undefined_table  THEN NULL;
         WHEN duplicate_object THEN NULL; END $$;

-- system_settings: is_public gate
DO $$ BEGIN
  ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- subscription_plans: cap/return/referral columns
DO $$ BEGIN
  ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS monthly_return_cap NUMERIC(12,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS break_even_day INTEGER NOT NULL DEFAULT 30;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS min_referrals INTEGER NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- user_subscriptions: plan earnings tracking
DO $$ BEGIN
  ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS plan_earnings NUMERIC(12,2) NOT NULL DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- tasks: extra columns for AdminTasks & Earn pages
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS required_plan  TEXT        DEFAULT 'all';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_hours INTEGER     DEFAULT 24;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS affiliate_url  TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS expires_at     TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Add task_reward to transaction_type enum
DO $$ BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'task_reward';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_object  THEN NULL; END $$;

-- =========================================================
-- SECTION 2: NEW TABLES
-- =========================================================

-- 2a. POST VIEWS — track unique views for author analytics
CREATE TABLE IF NOT EXISTS public.post_views (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID,
  viewer_ip  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_views_public_insert" ON public.post_views;
CREATE POLICY "post_views_public_insert"
ON public.post_views FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "post_views_select_own_or_admin" ON public.post_views;
CREATE POLICY "post_views_select_own_or_admin"
ON public.post_views FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON public.post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON public.post_views(user_id);

-- 2b. SWAP TRANSACTIONS — Swap page
CREATE TABLE IF NOT EXISTS public.swap_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL,
  from_amount   NUMERIC(12,2) NOT NULL CHECK (from_amount > 0),
  from_currency TEXT        NOT NULL DEFAULT 'naira',
  to_amount     NUMERIC(12,6) NOT NULL,
  to_currency   TEXT        NOT NULL DEFAULT 'usdt',
  exchange_rate NUMERIC(12,4) NOT NULL DEFAULT 1600,
  fee_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swap_tx_select_own_or_admin" ON public.swap_transactions;
CREATE POLICY "swap_tx_select_own_or_admin"
ON public.swap_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "swap_tx_insert_own" ON public.swap_transactions;
CREATE POLICY "swap_tx_insert_own"
ON public.swap_transactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "swap_tx_update_admin" ON public.swap_transactions;
CREATE POLICY "swap_tx_update_admin"
ON public.swap_transactions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_swap_transactions_user ON public.swap_transactions(user_id);

DROP TRIGGER IF EXISTS trg_swap_tx_updated_at ON public.swap_transactions;
CREATE TRIGGER trg_swap_tx_updated_at
BEFORE UPDATE ON public.swap_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2c. AUDIT LOGS — Admin logs, withdrawal approvals
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID        NOT NULL,
  action      TEXT        NOT NULL,
  target_type TEXT        NOT NULL,
  target_id   TEXT,
  meta        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only"
ON public.audit_logs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor  ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- =========================================================
-- SECTION 3: ENSURE EXISTING OPTIONAL TABLES EXIST
-- =========================================================

-- Promotions (AdminPromotions, Promotional pages)
CREATE TABLE IF NOT EXISTS public.promotions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT        NOT NULL,
  description        TEXT        NOT NULL,
  image_url          TEXT        NOT NULL,
  cta_text           TEXT        NOT NULL DEFAULT 'Learn more',
  cta_url            TEXT,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_by_user_id UUID        NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_public_read_active" ON public.promotions;
CREATE POLICY "promotions_public_read_active"
ON public.promotions FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "promotions_admin_manage" ON public.promotions;
CREATE POLICY "promotions_admin_manage"
ON public.promotions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, created_at DESC);

DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payout methods (Wallet, Settings pages)
CREATE TABLE IF NOT EXISTS public.payout_methods (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL,
  method         TEXT        NOT NULL CHECK (method IN ('opay','usdt_trc20','minipay')),
  account_name   TEXT,
  account_number TEXT,
  wallet_address TEXT,
  minipay_uid    TEXT,
  is_default     BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payout_methods_userid_method_key UNIQUE (user_id, method)
);

ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payout_select_own_admin" ON public.payout_methods;
CREATE POLICY "payout_select_own_admin"
ON public.payout_methods FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "payout_insert_own_admin" ON public.payout_methods;
CREATE POLICY "payout_insert_own_admin"
ON public.payout_methods FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "payout_update_own_admin" ON public.payout_methods;
CREATE POLICY "payout_update_own_admin"
ON public.payout_methods FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "payout_delete_own_admin" ON public.payout_methods;
CREATE POLICY "payout_delete_own_admin"
ON public.payout_methods FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_payout_methods_user ON public.payout_methods(user_id);

DROP TRIGGER IF EXISTS trg_payout_methods_updated_at ON public.payout_methods;
CREATE TRIGGER trg_payout_methods_updated_at
BEFORE UPDATE ON public.payout_methods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Withdrawal requests (Wallet page)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency         TEXT        NOT NULL CHECK (currency IN ('naira','usdt')),
  method           TEXT        NOT NULL CHECK (method IN ('opay','usdt_trc20','minipay')),
  payout_method_id UUID        REFERENCES public.payout_methods(id) ON DELETE SET NULL,
  details          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wr_select_own_admin" ON public.withdrawal_requests;
CREATE POLICY "wr_select_own_admin"
ON public.withdrawal_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "wr_insert_own_admin" ON public.withdrawal_requests;
CREATE POLICY "wr_insert_own_admin"
ON public.withdrawal_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "wr_update_admin_only" ON public.withdrawal_requests;
CREATE POLICY "wr_update_admin_only"
ON public.withdrawal_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_wr_user_status ON public.withdrawal_requests(user_id, status);

DROP TRIGGER IF EXISTS trg_wr_updated_at ON public.withdrawal_requests;
CREATE TRIGGER trg_wr_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications (used across all pages for alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  type       TEXT        NOT NULL DEFAULT 'info',
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notif_insert_admin" ON public.notifications;
CREATE POLICY "notif_insert_admin"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Community links (Settings, Home pages)
CREATE TABLE IF NOT EXISTS public.community_links (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  url         TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_links_public_read" ON public.community_links;
CREATE POLICY "community_links_public_read"
ON public.community_links FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS "community_links_admin_manage" ON public.community_links;
CREATE POLICY "community_links_admin_manage"
ON public.community_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_community_links_updated_at ON public.community_links;
CREATE TRIGGER trg_community_links_updated_at
BEFORE UPDATE ON public.community_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tasks & user_tasks (Earn, AdminTasks pages)
CREATE TABLE IF NOT EXISTS public.tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  description    TEXT,
  reward_amount  NUMERIC     DEFAULT 0,
  target_count   INTEGER     DEFAULT 1,
  task_type      TEXT        NOT NULL,
  status         TEXT        DEFAULT 'active',
  required_plan  TEXT        DEFAULT 'all',
  duration_hours INTEGER     DEFAULT 24,
  affiliate_url  TEXT,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_public_read" ON public.tasks;
CREATE POLICY "tasks_public_read"
ON public.tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "tasks_admin_write" ON public.tasks;
CREATE POLICY "tasks_admin_write"
ON public.tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.user_tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  task_id        UUID        REFERENCES public.tasks(id) ON DELETE CASCADE,
  progress       INTEGER     DEFAULT 0,
  completed      BOOLEAN     DEFAULT FALSE,
  reward_claimed BOOLEAN     DEFAULT FALSE,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_tasks_select_own" ON public.user_tasks;
CREATE POLICY "user_tasks_select_own"
ON public.user_tasks FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_tasks_insert_own" ON public.user_tasks;
CREATE POLICY "user_tasks_insert_own"
ON public.user_tasks FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_tasks_update_own" ON public.user_tasks;
CREATE POLICY "user_tasks_update_own"
ON public.user_tasks FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_tasks_admin_all" ON public.user_tasks;
CREATE POLICY "user_tasks_admin_all"
ON public.user_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- =========================================================
-- SECTION 4: STORAGE BUCKETS
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- SECTION 5: TRIGGER FUNCTIONS — Post counters
-- =========================================================

-- Increment post.views when a new post_view row is inserted
CREATE OR REPLACE FUNCTION public.increment_post_views()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET views = views + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_post_views ON public.post_views;
CREATE TRIGGER trg_increment_post_views
AFTER INSERT ON public.post_views
FOR EACH ROW EXECUTE FUNCTION public.increment_post_views();

-- Increment post.reads when a new post_read row is inserted
CREATE OR REPLACE FUNCTION public.increment_post_reads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET reads = reads + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_post_reads ON public.post_reads;
CREATE TRIGGER trg_increment_post_reads
AFTER INSERT ON public.post_reads
FOR EACH ROW EXECUTE FUNCTION public.increment_post_reads();

-- =========================================================
-- SECTION 6: VIEWS FOR PAGES
-- =========================================================

-- PUBLIC PROFILES VIEW — Articles, Referral, Leaderboard pages
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT user_id, name, username, avatar_url, bio, referral_code, status, joined_at
FROM public.profiles
WHERE status = 'active';

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- APPROVED POSTS WITH AUTHORS — Home, Earn, Articles pages
CREATE OR REPLACE VIEW public.approved_posts_with_authors AS
SELECT
  p.id, p.title, p.slug, p.excerpt, p.featured_image,
  p.word_count, p.reading_time_seconds, p.views, p.reads, p.earnings,
  p.is_story, p.seo_meta_title, p.seo_meta_description,
  p.published_at, p.created_at, p.author_user_id,
  pr.name       AS author_name,
  pr.username   AS author_username,
  pr.avatar_url AS author_avatar,
  c.name        AS category_name,
  c.slug        AS category_slug
FROM public.posts p
LEFT JOIN public.profiles  pr ON pr.user_id  = p.author_user_id
LEFT JOIN public.categories c  ON c.id        = p.category_id
WHERE p.status = 'approved';

GRANT SELECT ON public.approved_posts_with_authors TO anon, authenticated;

-- =========================================================
-- SECTION 7: RPC FUNCTIONS
-- =========================================================

-- LEADERBOARD — Leaderboard page
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 50)
RETURNS TABLE (
  rank              bigint,
  user_id           uuid,
  name              text,
  username          text,
  avatar_url        text,
  total_earnings    numeric,
  referral_earnings numeric,
  plan_id           public.plan_id
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY wb.total_earnings DESC),
    p.user_id, p.name, p.username, p.avatar_url,
    wb.total_earnings, wb.referral_earnings,
    COALESCE(us.plan_id, 'free'::public.plan_id)
  FROM public.wallet_balances wb
  JOIN  public.profiles          p  ON p.user_id  = wb.user_id
  LEFT JOIN public.user_subscriptions us ON us.user_id = wb.user_id
  WHERE p.status = 'active'
  ORDER BY wb.total_earnings DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;

-- MY PROFILE STATS — Dashboard, Profile, Analytics pages
CREATE OR REPLACE FUNCTION public.get_my_profile_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet public.wallet_balances%ROWTYPE;
  _sub    public.user_subscriptions%ROWTYPE;
  _prof   public.profiles%ROWTYPE;
  _ref_count  bigint; _posts_count bigint; _reads_count bigint;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO _wallet FROM public.wallet_balances    WHERE user_id = _uid;
  SELECT * INTO _sub    FROM public.user_subscriptions WHERE user_id = _uid;
  SELECT * INTO _prof   FROM public.profiles           WHERE user_id = _uid;
  SELECT COUNT(*) INTO _ref_count   FROM public.referrals  WHERE referrer_user_id = _uid;
  SELECT COUNT(*) INTO _posts_count FROM public.posts      WHERE author_user_id = _uid AND status = 'approved';
  SELECT COUNT(*) INTO _reads_count FROM public.post_reads WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'balance',           COALESCE(_wallet.balance, 0),
    'total_earnings',    COALESCE(_wallet.total_earnings, 0),
    'referral_earnings', COALESCE(_wallet.referral_earnings, 0),
    'post_earnings',     COALESCE(_wallet.post_earnings, 0),
    'usdt_balance',      COALESCE(_wallet.usdt_balance, 0),
    'plan_id',           COALESCE(_sub.plan_id::text, 'free'),
    'plan_earnings',     COALESCE(_sub.plan_earnings, 0),
    'is_completed',      COALESCE(_sub.is_completed, false),
    'referral_code',     _prof.referral_code,
    'username',          _prof.username,
    'referral_count',    _ref_count,
    'posts_count',       _posts_count,
    'reads_count',       _reads_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile_stats() TO authenticated;

-- ADMIN STATS — AdminManagement page (overview dashboard)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller          uuid := auth.uid();
  _total_users     bigint; _total_posts     bigint; _pending_posts   bigint;
  _pending_wd_cnt  bigint; _pending_wd_sum  numeric;
  _total_payouts   numeric; _total_earnings  numeric;
  _total_subs      bigint;
BEGIN
  IF NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  SELECT COUNT(*) INTO _total_users  FROM public.profiles;
  SELECT COUNT(*) INTO _total_posts  FROM public.posts WHERE status = 'approved';
  SELECT COUNT(*) INTO _pending_posts FROM public.posts WHERE status = 'pending';
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO _pending_wd_cnt, _pending_wd_sum
    FROM public.wallet_transactions WHERE type = 'withdrawal' AND status = 'pending';
  SELECT COALESCE(SUM(amount), 0) INTO _total_payouts
    FROM public.wallet_transactions WHERE type = 'withdrawal' AND status = 'completed';
  SELECT COALESCE(SUM(total_earnings), 0) INTO _total_earnings FROM public.wallet_balances;
  SELECT COUNT(*) INTO _total_subs FROM public.user_subscriptions WHERE plan_id <> 'free';
  RETURN jsonb_build_object(
    'total_users',      _total_users,
    'total_posts',      _total_posts,
    'pending_posts',    _pending_posts,
    'pending_wd_count', _pending_wd_cnt,
    'pending_wd_sum',   _pending_wd_sum,
    'total_payouts',    _total_payouts,
    'total_earnings',   _total_earnings,
    'paid_subscribers', _total_subs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- EXECUTE SWAP — Swap page
CREATE OR REPLACE FUNCTION public.execute_swap(
  _amount   numeric,
  _rate     numeric DEFAULT 1600,
  _fee_pct  numeric DEFAULT 0.005
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid      uuid := auth.uid();
  _balance  numeric;
  _fee      numeric;
  _usdt_out numeric;
  _enabled  boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _amount < 1000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Minimum swap amount is ₦1,000.');
  END IF;
  -- Check swap enabled
  SELECT (value->>'enabled')::boolean INTO _enabled
  FROM public.system_settings WHERE key = 'swap_settings';
  IF _enabled = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'Swap is temporarily disabled.');
  END IF;
  SELECT balance INTO _balance FROM public.wallet_balances WHERE user_id = _uid;
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance for this swap.');
  END IF;
  _fee      := ROUND(_amount * _fee_pct, 2);
  _usdt_out := ROUND((_amount - _fee) / _rate, 6);
  UPDATE public.wallet_balances
  SET balance = balance - _amount, usdt_balance = usdt_balance + _usdt_out, updated_at = now()
  WHERE user_id = _uid;
  INSERT INTO public.swap_transactions
    (user_id, from_amount, from_currency, to_amount, to_currency, exchange_rate, fee_amount, status)
  VALUES (_uid, _amount, 'naira', _usdt_out, 'usdt', _rate, _fee, 'completed');
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Swapped ₦%s → $%s USDT successfully.', _amount, _usdt_out),
    'usdt_received', _usdt_out,
    'fee', _fee
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_swap(numeric, numeric, numeric) TO authenticated;

-- ADMIN APPROVE WITHDRAWAL — AdminTransactions page
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  _transaction_id uuid,
  _approve        boolean,
  _note           text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller     uuid := auth.uid();
  _tx         public.wallet_transactions%ROWTYPE;
  _new_status text;
BEGIN
  IF NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;
  SELECT * INTO _tx FROM public.wallet_transactions
  WHERE id = _transaction_id AND type = 'withdrawal' AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Transaction not found or already processed.');
  END IF;
  _new_status := CASE WHEN _approve THEN 'completed' ELSE 'failed' END;
  UPDATE public.wallet_transactions
  SET status = _new_status,
      meta   = meta || jsonb_build_object('reviewed_by', _caller, 'reviewed_at', now(), 'note', COALESCE(_note, ''))
  WHERE id = _transaction_id;
  IF NOT _approve THEN
    UPDATE public.wallet_balances SET balance = balance + _tx.amount, updated_at = now()
    WHERE user_id = _tx.user_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, meta)
  VALUES (_caller,
    CASE WHEN _approve THEN 'approve_withdrawal' ELSE 'reject_withdrawal' END,
    'wallet_transactions', _transaction_id::text,
    jsonb_build_object('amount', _tx.amount, 'user_id', _tx.user_id, 'note', _note));
  PERFORM public.send_notification(
    _tx.user_id,
    CASE WHEN _approve
      THEN format('Your withdrawal of ₦%s has been approved and processed.', _tx.amount)
      ELSE format('Your withdrawal of ₦%s was declined. Reason: %s. Your balance has been refunded.', _tx.amount, COALESCE(_note, 'Does not meet requirements'))
    END,
    'withdrawal');
  RETURN jsonb_build_object('success', true, 'new_status', _new_status,
    'message', format('Withdrawal %s.', CASE WHEN _approve THEN 'approved' ELSE 'rejected and refunded' END));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, boolean, text) TO authenticated;

-- PLATFORM LOCKDOWN — AdminSettings page
CREATE OR REPLACE FUNCTION public.toggle_platform_lockdown(_lock boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO public.system_settings (key, value, is_public, updated_by_user_id)
  VALUES ('platform_lockdown', jsonb_build_object('locked', _lock), false, _caller)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by_user_id = _caller, updated_at = now();
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, meta)
  VALUES (_caller,
    CASE WHEN _lock THEN 'platform_lockdown_activated' ELSE 'platform_lockdown_deactivated' END,
    'system_settings', 'platform_lockdown',
    jsonb_build_object('locked', _lock, 'timestamp', now()));
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_platform_lockdown(boolean) TO authenticated;

-- ADMIN SET USER STATUS — AdminUsers page
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  _target_user_id uuid,
  _status         public.user_status,
  _reason         text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  UPDATE public.profiles SET status = _status, updated_at = now()
  WHERE user_id = _target_user_id;
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, meta)
  VALUES (_caller, 'set_user_status', 'profiles', _target_user_id::text,
    jsonb_build_object('new_status', _status, 'reason', _reason));
  PERFORM public.send_notification(_target_user_id,
    CASE _status
      WHEN 'banned'  THEN 'Your account has been suspended. Please contact support.'
      WHEN 'active'  THEN 'Your account has been reactivated. Welcome back!'
      ELSE 'Your account status has been updated.'
    END, 'account');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, public.user_status, text) TO authenticated;

-- SEND NOTIFICATION — Admin broadcast tool
CREATE OR REPLACE FUNCTION public.send_notification(
  _user_id uuid, _message text, _type text DEFAULT 'info'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller uuid := auth.uid();
BEGIN
  IF _caller IS NOT NULL AND NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can send notifications';
  END IF;
  INSERT INTO public.notifications (user_id, message, type) VALUES (_user_id, _message, _type);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text) TO authenticated;

-- MARK ALL NOTIFICATIONS READ — for notification bell UI
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  UPDATE public.notifications SET is_read = true WHERE user_id = _uid AND is_read = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- AUTHOR EARNINGS — credits author when post hits view milestones
CREATE OR REPLACE FUNCTION public.credit_author_earnings(_post_id uuid, _reader_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author_id         uuid;
  _monetization_rate numeric;
  _current_views     integer;
  _author_earnings   numeric;
BEGIN
  SELECT author_user_id INTO _author_id FROM public.posts WHERE id = _post_id;
  IF _author_id IS NULL OR _author_id = _reader_id THEN RETURN; END IF;
  SELECT (value->>'rate')::numeric INTO _monetization_rate
  FROM public.system_settings WHERE key = 'monetization_rate';
  IF _monetization_rate IS NULL OR _monetization_rate <= 0 THEN RETURN; END IF;
  SELECT views INTO _current_views FROM public.posts WHERE id = _post_id;
  IF _current_views % 1000 = 0 AND _current_views > 0 THEN
    _author_earnings := _monetization_rate;
    UPDATE public.posts SET earnings = earnings + _author_earnings WHERE id = _post_id;
    PERFORM public.credit_wallet(
      _author_id, _author_earnings, 'post_approval_reward',
      format('Author reward — %s views milestone', _current_views),
      jsonb_build_object('post_id', _post_id, 'milestone_views', _current_views));
    UPDATE public.wallet_balances
    SET post_earnings = post_earnings + _author_earnings, updated_at = now()
    WHERE user_id = _author_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_author_earnings(uuid, uuid) TO authenticated;

-- UPDATED claim_post_read — respects lockdown + credits author
CREATE OR REPLACE FUNCTION public.claim_post_read(_post_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id       public.plan_id;
  _reward        numeric;
  _read_limit    integer;
  _return_cap    numeric;
  _counter       public.daily_user_counters;
  _plan_earnings numeric;
  _is_locked     boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT (value->>'locked')::boolean INTO _is_locked
  FROM public.system_settings WHERE key = 'platform_lockdown';
  IF _is_locked = true THEN
    RETURN jsonb_build_object('success', false, 'message', 'Platform rewards temporarily suspended.', 'amount', 0);
  END IF;
  IF EXISTS (SELECT 1 FROM public.post_reads WHERE user_id = _uid AND post_id = _post_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already earned from this post.', 'amount', 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = _post_id AND status = 'approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Post not eligible for rewards.', 'amount', 0);
  END IF;
  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings
  FROM public.user_subscriptions WHERE user_id = _uid;
  IF _plan_id IS NULL THEN _plan_id := 'free'; _plan_earnings := 0; END IF;
  SELECT read_reward, daily_read_limit, monthly_return_cap
  INTO _reward, _read_limit, _return_cap
  FROM public.subscription_plans WHERE id = _plan_id;
  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', false, 'message', 'Monthly Return Cap reached. Upgrade to continue earning.', 'amount', 0);
  END IF;
  _counter := public.ensure_daily_counter(_uid);
  IF _counter.read_count >= _read_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached. Earnings resume tomorrow.', 'amount', 0);
  END IF;
  INSERT INTO public.post_reads(user_id, post_id, earned_amount) VALUES (_uid, _post_id, _reward);
  UPDATE public.daily_user_counters SET read_count = read_count + 1, updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;
  PERFORM public.credit_wallet(_uid, _reward, 'reading_reward', 'Article Consumption Reward',
    jsonb_build_object('post_id', _post_id));
  PERFORM public.credit_author_earnings(_post_id, _uid);
  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for reading.', _reward), 'amount', _reward);
END;
$$;

-- UPDATED submit_comment_with_reward — respects lockdown
CREATE OR REPLACE FUNCTION public.submit_comment_with_reward(_post_id uuid, _content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id       public.plan_id;
  _reward        numeric;
  _comment_limit integer;
  _return_cap    numeric;
  _counter       public.daily_user_counters;
  _plan_earnings numeric;
  _comment_id    uuid;
  _is_locked     boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT (value->>'locked')::boolean INTO _is_locked
  FROM public.system_settings WHERE key = 'platform_lockdown';
  INSERT INTO public.post_comments(post_id, user_id, content) VALUES (_post_id, _uid, _content)
  RETURNING id INTO _comment_id;
  IF _is_locked = true THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Rewards temporarily suspended.', 'amount', 0, 'comment_id', _comment_id);
  END IF;
  IF EXISTS (SELECT 1 FROM public.comment_earnings WHERE user_id = _uid AND post_id = _post_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. You already claimed comment earnings from this post.', 'amount', 0, 'comment_id', _comment_id);
  END IF;
  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings
  FROM public.user_subscriptions WHERE user_id = _uid;
  IF _plan_id IS NULL THEN _plan_id := 'free'; _plan_earnings := 0; END IF;
  SELECT comment_reward, daily_comment_limit, monthly_return_cap
  INTO _reward, _comment_limit, _return_cap
  FROM public.subscription_plans WHERE id = _plan_id;
  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Monthly cap reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;
  _counter := public.ensure_daily_counter(_uid);
  IF _counter.comment_count >= _comment_limit THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Daily comment limit reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;
  INSERT INTO public.comment_earnings(user_id, post_id, comment_id, earned_amount)
  VALUES (_uid, _post_id, _comment_id, _reward);
  UPDATE public.daily_user_counters SET comment_count = comment_count + 1, updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;
  PERFORM public.credit_wallet(_uid, _reward, 'comment_reward', 'Community Discussion Reward',
    jsonb_build_object('post_id', _post_id, 'comment_id', _comment_id));
  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for commenting.', _reward), 'amount', _reward, 'comment_id', _comment_id);
END;
$$;

-- TASK REWARD CLAIM — Earn page
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_task_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID; v_reward NUMERIC; v_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Not authenticated'); END IF;
  SELECT reward_amount INTO v_reward FROM public.tasks WHERE id = p_task_id AND status = 'active';
  IF v_reward IS NULL THEN RETURN json_build_object('success', false, 'message', 'Task not found or inactive'); END IF;
  SELECT reward_claimed INTO v_claimed FROM public.user_tasks WHERE user_id = v_user_id AND task_id = p_task_id;
  IF v_claimed THEN RETURN json_build_object('success', false, 'message', 'Reward already claimed'); END IF;
  INSERT INTO public.user_tasks (user_id, task_id, progress, completed, reward_claimed)
  VALUES (v_user_id, p_task_id, 1, true, true)
  ON CONFLICT (user_id, task_id) DO UPDATE SET completed = true, reward_claimed = true, updated_at = NOW();
  UPDATE public.wallet_balances SET total_earnings = total_earnings + v_reward, balance = balance + v_reward
  WHERE user_id = v_user_id;
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (v_user_id, v_reward, 'task_reward', 'completed', 'Completed Task Reward');
  RETURN json_build_object('success', true, 'message', 'Task reward claimed successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_task_reward(uuid) TO authenticated;

-- =========================================================
-- SECTION 8: NOTIFICATION TRIGGERS (Article moderation)
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_on_post_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'pending' AND OLD.status <> 'pending' THEN
    INSERT INTO public.notifications (user_id, message, type) VALUES (
      NEW.author_user_id,
      format('Your article "%s" has been submitted for review.', NEW.title),
      'article_submitted') ON CONFLICT DO NOTHING;
  ELSIF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.notifications (user_id, message, type) VALUES (
      NEW.author_user_id,
      format('🎉 Your article "%s" has been approved and is now live!', NEW.title),
      'article_approved');
  ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
    INSERT INTO public.notifications (user_id, message, type) VALUES (
      NEW.author_user_id,
      format('Your article "%s" was not approved. Reason: %s', NEW.title, COALESCE(NEW.moderation_summary, 'Does not meet content guidelines.')),
      'article_rejected');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_moderation_notify ON public.posts;
CREATE TRIGGER trg_post_moderation_notify
AFTER UPDATE OF status ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_moderation();

-- =========================================================
-- SECTION 9: SYSTEM SETTINGS SEEDS (All keys used by pages)
-- =========================================================

-- Page toggles — used by AdminSettings, DashboardLayout
INSERT INTO public.system_settings (key, value, is_public) VALUES (
  'page_toggles',
  '{"leaderboardEnabled":true,"swapEnabled":true,"referralsEnabled":true,"earningsEnabled":true,"walletEnabled":true,"analyticsEnabled":true,"articlesEnabled":true,"plansEnabled":true}'::jsonb,
  true)
ON CONFLICT (key) DO UPDATE
SET value = '{"leaderboardEnabled":true,"swapEnabled":true,"referralsEnabled":true,"earningsEnabled":true,"walletEnabled":true,"analyticsEnabled":true,"articlesEnabled":true,"plansEnabled":true}'::jsonb,
    is_public = true, updated_at = now();

-- Monetization rate — AdminSettings page
INSERT INTO public.system_settings (key, value, is_public) VALUES ('monetization_rate', '{"rate": 500}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- Platform lockdown — AdminSettings page
INSERT INTO public.system_settings (key, value, is_public) VALUES ('platform_lockdown', '{"locked": false}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- Withdrawal settings — Wallet page
INSERT INTO public.system_settings (key, value, is_public) VALUES (
  'withdrawal_settings',
  '{"min_amount":1000,"max_amount":250000,"naira_fee_flat":50,"usdt_fee_pct":0.01,"processing_days":1}'::jsonb,
  false)
ON CONFLICT (key) DO NOTHING;

-- Swap settings — Swap page
INSERT INTO public.system_settings (key, value, is_public) VALUES (
  'swap_settings',
  '{"exchange_rate":1600,"fee_pct":0.005,"min_amount":1000,"enabled":true}'::jsonb,
  true)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- SECTION 10: COMMUNITY LINKS SEED
-- =========================================================

INSERT INTO public.community_links (channel_key, label, url, sort_order) VALUES
  ('whatsapp',  'WhatsApp Community', 'https://chat.whatsapp.com/jobbaworks', 1),
  ('telegram',  'Telegram Channel',   'https://t.me/jobbaworks',              2),
  ('twitter',   'Twitter / X',        'https://twitter.com/jobbaworks',       3),
  ('instagram', 'Instagram',          'https://instagram.com/jobbaworks',     4)
ON CONFLICT (channel_key) DO NOTHING;

-- =========================================================
-- SECTION 11: TASK SEEDS (Earn page defaults)
-- =========================================================

INSERT INTO public.tasks (title, description, reward_amount, target_count, task_type, required_plan, duration_hours) VALUES
  ('Refer 5 Friends Today',   'Invite 5 new users using your referral link today and get a massive bonus.', 5000, 5,  'referrals', 'all',     24),
  ('Read 10 Articles',        'Complete reading 10 premium articles today.',                                  500, 10, 'reads',     'all',     24),
  ('Comment on 5 Articles',   'Leave thoughtful comments on 5 approved articles today.',                      200, 5,  'comments',  'starter', 24),
  ('Complete Your Profile',   'Fill in your username, bio, and add a payment method.',                        100, 1,  'profile',   'all',     0),
  ('First Plan Subscription', 'Subscribe to any paid plan to unlock this reward.',                           1000, 1,  'upgrade',   'all',     0)
ON CONFLICT DO NOTHING;

-- =========================================================
-- SECTION 12: PERFORMANCE INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_posts_published_approved  ON public.posts(published_at DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_posts_is_story            ON public.posts(is_story) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_posts_views_desc          ON public.posts(views DESC) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_wallet_total_earnings     ON public.wallet_balances(total_earnings DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status              ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_user_tasks_completed      ON public.user_tasks(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer        ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred        ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_status       ON public.posts(author_user_id, status);
CREATE INDEX IF NOT EXISTS idx_wr_status                 ON public.withdrawal_requests(status);

-- =========================================================
-- SECTION 13: ENSURE PROFILES ARE PUBLICLY READABLE
-- (Needed by Articles, Leaderboard, Referral pages)
-- =========================================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT USING (true);

-- =========================================================
-- SECTION 14: FINAL FUNCTION GRANTS
-- =========================================================

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer)                             TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile_stats()                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_swap(numeric, numeric, numeric)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, boolean, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_platform_lockdown(boolean)                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, public.user_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_author_earnings(uuid, uuid)                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_post_read(uuid)                                TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_comment_with_reward(uuid, text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_task_reward(uuid)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_counter(uuid)                           TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_my_wallet()                               TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_my_subscription()                         TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_plan(uuid, public.plan_id)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_post_status(uuid, public.post_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_plan_upgrade(uuid, public.plan_id)           TO authenticated;

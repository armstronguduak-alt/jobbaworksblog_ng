-- Enums
DO $$ BEGIN
  CREATE TYPE public.plan_id AS ENUM ('free','starter','pro','elite','vip','executive','platinum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active','banned','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.post_status AS ENUM ('draft','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM (
    'reading_reward','comment_reward','post_approval_reward','referral_bonus','subscription_fee','withdrawal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core profile and roles tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text,
  name text NOT NULL,
  phone text,
  avatar_url text,
  bio text,
  referral_code text NOT NULL UNIQUE,
  referred_by_code text,
  status public.user_status NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Plans and subscription state
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id public.plan_id PRIMARY KEY,
  name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  daily_read_limit integer NOT NULL DEFAULT 0,
  daily_comment_limit integer NOT NULL DEFAULT 0,
  read_reward numeric(12,2) NOT NULL DEFAULT 0,
  comment_reward numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan_id public.plan_id NOT NULL DEFAULT 'free',
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Referrals and referral rewards
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  referral_code_used text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_user_id, referred_user_id)
);

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  plan_id public.plan_id NOT NULL,
  plan_price numeric(12,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.25,
  commission_amount numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_user_id, referred_user_id, plan_id)
);

-- Content tables
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL DEFAULT '',
  featured_image text,
  word_count integer NOT NULL DEFAULT 0,
  reading_time_seconds integer NOT NULL DEFAULT 60,
  status public.post_status NOT NULL DEFAULT 'draft',
  moderation_summary text,
  moderation_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by_user_id uuid,
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Earnings tracking
CREATE TABLE IF NOT EXISTS public.daily_user_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  counter_date date NOT NULL DEFAULT (CURRENT_DATE),
  read_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, counter_date)
);

CREATE TABLE IF NOT EXISTS public.post_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  earned_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.comment_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  earned_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.wallet_balances (
  user_id uuid PRIMARY KEY,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  usdt_balance numeric(12,2) NOT NULL DEFAULT 0,
  total_earnings numeric(12,2) NOT NULL DEFAULT 0,
  post_earnings numeric(12,2) NOT NULL DEFAULT 0,
  referral_earnings numeric(12,2) NOT NULL DEFAULT 0,
  pending_rewards numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  description text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by_user_id uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_daily_counters_user_date ON public.daily_user_counters(user_id, counter_date);
CREATE INDEX IF NOT EXISTS idx_post_reads_user ON public.post_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- Trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Word count + read time helper
CREATE OR REPLACE FUNCTION public.compute_post_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  wc integer;
BEGIN
  wc := COALESCE(array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g')), '\s+'), 1), 0);
  NEW.word_count := wc;
  NEW.reading_time_seconds := GREATEST(60, CEIL((wc::numeric / 200) * 60)::int);
  RETURN NEW;
END;
$$;

-- Validation trigger for SEO submission requirements
CREATE OR REPLACE FUNCTION public.validate_post_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('pending','approved') AND NEW.word_count < 800 THEN
    RAISE EXCEPTION 'Post must contain at least 800 words before submission/approval.';
  END IF;
  RETURN NEW;
END;
$$;

-- Role check function (security definer to avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Ensure read counters row exists for today
CREATE OR REPLACE FUNCTION public.ensure_daily_counter(_user_id uuid)
RETURNS public.daily_user_counters
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.daily_user_counters;
BEGIN
  INSERT INTO public.daily_user_counters (user_id, counter_date)
  VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, counter_date) DO NOTHING;

  SELECT * INTO rec
  FROM public.daily_user_counters
  WHERE user_id = _user_id AND counter_date = CURRENT_DATE;

  RETURN rec;
END;
$$;

-- Credit wallet helper
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid,
  _amount numeric,
  _type public.transaction_type,
  _description text,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, balance, total_earnings, pending_rewards)
  VALUES (_user_id, _amount, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.wallet_balances.balance + EXCLUDED.balance,
      total_earnings = public.wallet_balances.total_earnings + EXCLUDED.total_earnings,
      pending_rewards = public.wallet_balances.pending_rewards + EXCLUDED.pending_rewards,
      updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (_user_id, _amount, _type, 'completed', _description, COALESCE(_meta, '{}'::jsonb));
END;
$$;

-- Reading reward claim (enforces unique per post + daily limit)
CREATE OR REPLACE FUNCTION public.claim_post_read(_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id public.plan_id;
  _reward numeric;
  _read_limit integer;
  _counter public.daily_user_counters;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.post_reads
    WHERE user_id = _uid AND post_id = _post_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already earned from this post.', 'amount', 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.posts WHERE id = _post_id AND status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Post is not eligible for rewards.', 'amount', 0);
  END IF;

  SELECT plan_id INTO _plan_id
  FROM public.user_subscriptions
  WHERE user_id = _uid;

  IF _plan_id IS NULL THEN
    _plan_id := 'free';
  END IF;

  SELECT read_reward, daily_read_limit
  INTO _reward, _read_limit
  FROM public.subscription_plans
  WHERE id = _plan_id;

  _counter := public.ensure_daily_counter(_uid);

  IF _counter.read_count >= _read_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily earning limit reached. You can still read posts but earnings will resume tomorrow.', 'amount', 0);
  END IF;

  INSERT INTO public.post_reads(user_id, post_id, earned_amount)
  VALUES (_uid, _post_id, _reward);

  UPDATE public.daily_user_counters
  SET read_count = read_count + 1,
      updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(
    _uid,
    _reward,
    'reading_reward',
    'Article Consumption Reward',
    jsonb_build_object('post_id', _post_id)
  );

  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for reading.', _reward), 'amount', _reward);
END;
$$;

-- Submit comment + optional reward
CREATE OR REPLACE FUNCTION public.submit_comment_with_reward(_post_id uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id public.plan_id;
  _reward numeric;
  _comment_limit integer;
  _counter public.daily_user_counters;
  _comment_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.post_comments(post_id, user_id, content)
  VALUES (_post_id, _uid, _content)
  RETURNING id INTO _comment_id;

  IF EXISTS (
    SELECT 1 FROM public.comment_earnings
    WHERE user_id = _uid AND post_id = _post_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted successfully. You already claimed comment earnings from this post.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  SELECT plan_id INTO _plan_id
  FROM public.user_subscriptions
  WHERE user_id = _uid;

  IF _plan_id IS NULL THEN
    _plan_id := 'free';
  END IF;

  SELECT comment_reward, daily_comment_limit
  INTO _reward, _comment_limit
  FROM public.subscription_plans
  WHERE id = _plan_id;

  _counter := public.ensure_daily_counter(_uid);

  IF _counter.comment_count >= _comment_limit THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted successfully. Daily comment earning limit reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  INSERT INTO public.comment_earnings(user_id, post_id, comment_id, earned_amount)
  VALUES (_uid, _post_id, _comment_id, _reward);

  UPDATE public.daily_user_counters
  SET comment_count = comment_count + 1,
      updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(
    _uid,
    _reward,
    'comment_reward',
    'Community Discussion Reward',
    jsonb_build_object('post_id', _post_id, 'comment_id', _comment_id)
  );

  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for commenting.', _reward), 'amount', _reward, 'comment_id', _comment_id);
END;
$$;

-- Referral commission trigger: 25% of referred user's paid plan
CREATE OR REPLACE FUNCTION public.process_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer uuid;
  _price numeric(12,2);
  _commission numeric(12,2);
BEGIN
  IF NEW.plan_id = 'free' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.plan_id = OLD.plan_id THEN
    RETURN NEW;
  END IF;

  SELECT r.referrer_user_id INTO _referrer
  FROM public.referrals r
  WHERE r.referred_user_id = NEW.user_id;

  IF _referrer IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT price INTO _price
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  _commission := ROUND(_price * 0.25, 2);

  INSERT INTO public.referral_commissions(
    referrer_user_id,
    referred_user_id,
    plan_id,
    plan_price,
    commission_rate,
    commission_amount
  )
  VALUES (_referrer, NEW.user_id, NEW.plan_id, _price, 0.25, _commission)
  ON CONFLICT (referrer_user_id, referred_user_id, plan_id) DO NOTHING;

  IF FOUND THEN
    PERFORM public.credit_wallet(
      _referrer,
      _commission,
      'referral_bonus',
      'Referral plan upgrade bonus (25%)',
      jsonb_build_object('referred_user_id', NEW.user_id, 'plan_id', NEW.plan_id)
    );

    UPDATE public.wallet_balances
    SET referral_earnings = referral_earnings + _commission,
        updated_at = now()
    WHERE user_id = _referrer;
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_posts_compute_metrics ON public.posts;
CREATE TRIGGER trg_posts_compute_metrics BEFORE INSERT OR UPDATE OF content ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.compute_post_metrics();

DROP TRIGGER IF EXISTS trg_posts_validate_submission ON public.posts;
CREATE TRIGGER trg_posts_validate_submission BEFORE INSERT OR UPDATE OF status, word_count ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.validate_post_submission();

DROP TRIGGER IF EXISTS trg_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER trg_post_comments_updated_at BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_daily_user_counters_updated_at ON public.daily_user_counters;
CREATE TRIGGER trg_daily_user_counters_updated_at BEFORE UPDATE ON public.daily_user_counters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_subscriptions_referral_commission ON public.user_subscriptions;
CREATE TRIGGER trg_user_subscriptions_referral_commission
AFTER INSERT OR UPDATE OF plan_id ON public.user_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.process_referral_commission();

-- Seed plans
INSERT INTO public.subscription_plans (id, name, price, daily_read_limit, daily_comment_limit, read_reward, comment_reward, is_active)
VALUES
  ('free', 'Free Tier', 0, 3, 1, 50, 20, true),
  ('starter', 'Starter', 2000, 5, 2, 60, 30, true),
  ('pro', 'Pro Active', 5000, 7, 3, 70, 40, true),
  ('elite', 'Elite Growth', 10000, 10, 4, 80, 50, true),
  ('vip', 'VIP Power', 20000, 12, 5, 90, 60, true),
  ('executive', 'Executive Master', 50000, 15, 6, 100, 70, true),
  ('platinum', 'Platinum Master', 100000, 20, 8, 120, 100, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  daily_read_limit = EXCLUDED.daily_read_limit,
  daily_comment_limit = EXCLUDED.daily_comment_limit,
  read_reward = EXCLUDED.read_reward,
  comment_reward = EXCLUDED.comment_reward,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed categories (requested list)
INSERT INTO public.categories (name, slug)
VALUES
  ('Technology', 'technology'),
  ('Entertainment', 'entertainment'),
  ('Health', 'health'),
  ('Lifestyle', 'lifestyle'),
  ('Business', 'business'),
  ('Design', 'design'),
  ('Education', 'education'),
  ('Product Reviews', 'product-reviews')
ON CONFLICT (name) DO NOTHING;

-- Seed system toggles
INSERT INTO public.system_settings (key, value)
VALUES (
  'page_toggles',
  '{"leaderboardEnabled": true, "swapEnabled": true, "referralsEnabled": true, "earningsEnabled": true, "walletEnabled": true}'::jsonb
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_user_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: user roles
DROP POLICY IF EXISTS "roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "roles_select_own_or_admin"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles_admin_manage" ON public.user_roles;
CREATE POLICY "roles_admin_manage"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies: plans (public readable)
DROP POLICY IF EXISTS "plans_public_read" ON public.subscription_plans;
CREATE POLICY "plans_public_read"
ON public.subscription_plans FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "plans_admin_write" ON public.subscription_plans;
CREATE POLICY "plans_admin_write"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies: user subscriptions
DROP POLICY IF EXISTS "subscriptions_select_own_or_admin" ON public.user_subscriptions;
CREATE POLICY "subscriptions_select_own_or_admin"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscriptions_insert_own_or_admin" ON public.user_subscriptions;
CREATE POLICY "subscriptions_insert_own_or_admin"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "subscriptions_update_own_or_admin" ON public.user_subscriptions;
CREATE POLICY "subscriptions_update_own_or_admin"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: referrals
DROP POLICY IF EXISTS "referrals_select_parties_or_admin" ON public.referrals;
CREATE POLICY "referrals_select_parties_or_admin"
ON public.referrals FOR SELECT
TO authenticated
USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "referrals_insert_referred_or_admin" ON public.referrals;
CREATE POLICY "referrals_insert_referred_or_admin"
ON public.referrals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: referral commissions
DROP POLICY IF EXISTS "referral_commissions_select_referrer_or_admin" ON public.referral_commissions;
CREATE POLICY "referral_commissions_select_referrer_or_admin"
ON public.referral_commissions FOR SELECT
TO authenticated
USING (auth.uid() = referrer_user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: categories (public read)
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
ON public.categories FOR SELECT
TO public
USING (is_active = true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write"
ON public.categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policies: posts
DROP POLICY IF EXISTS "posts_public_read_approved" ON public.posts;
CREATE POLICY "posts_public_read_approved"
ON public.posts FOR SELECT
TO public
USING (status = 'approved');

DROP POLICY IF EXISTS "posts_author_read_own" ON public.posts;
CREATE POLICY "posts_author_read_own"
ON public.posts FOR SELECT
TO authenticated
USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "posts_author_insert" ON public.posts;
CREATE POLICY "posts_author_insert"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "posts_author_update_or_admin" ON public.posts;
CREATE POLICY "posts_author_update_or_admin"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "posts_author_delete_or_admin" ON public.posts;
CREATE POLICY "posts_author_delete_or_admin"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = author_user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: comments
DROP POLICY IF EXISTS "comments_public_read" ON public.post_comments;
CREATE POLICY "comments_public_read"
ON public.post_comments FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON public.post_comments;
CREATE POLICY "comments_insert_own"
ON public.post_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_update_own_or_admin" ON public.post_comments;
CREATE POLICY "comments_update_own_or_admin"
ON public.post_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON public.post_comments;
CREATE POLICY "comments_delete_own_or_admin"
ON public.post_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: daily counters
DROP POLICY IF EXISTS "daily_counters_select_own_or_admin" ON public.daily_user_counters;
CREATE POLICY "daily_counters_select_own_or_admin"
ON public.daily_user_counters FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "daily_counters_insert_own_or_admin" ON public.daily_user_counters;
CREATE POLICY "daily_counters_insert_own_or_admin"
ON public.daily_user_counters FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "daily_counters_update_own_or_admin" ON public.daily_user_counters;
CREATE POLICY "daily_counters_update_own_or_admin"
ON public.daily_user_counters FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: read/comment earnings
DROP POLICY IF EXISTS "post_reads_select_own_or_admin" ON public.post_reads;
CREATE POLICY "post_reads_select_own_or_admin"
ON public.post_reads FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "post_reads_insert_own_or_admin" ON public.post_reads;
CREATE POLICY "post_reads_insert_own_or_admin"
ON public.post_reads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "comment_earnings_select_own_or_admin" ON public.comment_earnings;
CREATE POLICY "comment_earnings_select_own_or_admin"
ON public.comment_earnings FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "comment_earnings_insert_own_or_admin" ON public.comment_earnings;
CREATE POLICY "comment_earnings_insert_own_or_admin"
ON public.comment_earnings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: wallet
DROP POLICY IF EXISTS "wallet_balances_select_own_or_admin" ON public.wallet_balances;
CREATE POLICY "wallet_balances_select_own_or_admin"
ON public.wallet_balances FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallet_balances_write_own_or_admin" ON public.wallet_balances;
CREATE POLICY "wallet_balances_write_own_or_admin"
ON public.wallet_balances FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallet_tx_select_own_or_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_select_own_or_admin"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "wallet_tx_insert_own_or_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_insert_own_or_admin"
ON public.wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Policies: system settings
DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;
CREATE POLICY "system_settings_public_read"
ON public.system_settings FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "system_settings_admin_write" ON public.system_settings;
CREATE POLICY "system_settings_admin_write"
ON public.system_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_post_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  wc integer;
BEGIN
  wc := COALESCE(array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g')), '\s+'), 1), 0);
  NEW.word_count := wc;
  NEW.reading_time_seconds := GREATEST(60, CEIL((wc::numeric / 200) * 60)::int);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_post_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending','approved') AND NEW.word_count < 800 THEN
    RAISE EXCEPTION 'Post must contain at least 800 words before submission/approval.';
  END IF;
  RETURN NEW;
END;
$$;

-- Security hardening for sensitive financial/subscription/moderation tables

-- 1) wallet_balances: remove direct user writes, keep admin-only writes
DROP POLICY IF EXISTS wallet_balances_write_own_or_admin ON public.wallet_balances;

CREATE POLICY wallet_balances_admin_insert
ON public.wallet_balances
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY wallet_balances_admin_update
ON public.wallet_balances
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY wallet_balances_admin_delete
ON public.wallet_balances
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) user_subscriptions: remove self-assignment/upgrades, admin-only writes
DROP POLICY IF EXISTS subscriptions_insert_own_or_admin ON public.user_subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own_or_admin ON public.user_subscriptions;

CREATE POLICY subscriptions_admin_insert
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY subscriptions_admin_update
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY subscriptions_admin_delete
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) comment_earnings: remove direct user insert of arbitrary earnings
DROP POLICY IF EXISTS comment_earnings_insert_own_or_admin ON public.comment_earnings;

CREATE POLICY comment_earnings_admin_insert
ON public.comment_earnings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) posts moderation integrity: remove broad author update policy
DROP POLICY IF EXISTS posts_author_update_or_admin ON public.posts;

-- Authors can only edit their own unmoderated content (not approved posts)
CREATE POLICY posts_author_update_safe
ON public.posts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_user_id
  AND status IN ('draft'::public.post_status, 'pending'::public.post_status, 'rejected'::public.post_status)
)
WITH CHECK (
  auth.uid() = author_user_id
  AND status IN ('draft'::public.post_status, 'pending'::public.post_status, 'rejected'::public.post_status)
  AND approved_by_user_id IS NULL
  AND approved_at IS NULL
);

-- Moderators/Admins can update any post for moderation workflow
CREATE POLICY posts_moderator_admin_update
ON public.posts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);

-- 5) Trusted SECURITY DEFINER functions for controlled mutations

-- Ensure wallet row exists for current user (safe initializer)
CREATE OR REPLACE FUNCTION public.initialize_my_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.wallet_balances (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Ensure free subscription row exists for current user (safe initializer)
CREATE OR REPLACE FUNCTION public.initialize_my_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id)
  VALUES (_uid, 'free'::public.plan_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Admin/service-role-only plan assignment (use after payment verification)
CREATE OR REPLACE FUNCTION public.assign_user_plan(_user_id uuid, _plan_id public.plan_id)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _caller uuid := auth.uid();
  _role text := COALESCE(auth.role(), '');
BEGIN
  IF _role <> 'service_role' AND NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized to assign plans';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id)
  VALUES (_user_id, _plan_id)
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    updated_at = now();
END;
$$;

-- Moderator/admin-only status transition function
CREATE OR REPLACE FUNCTION public.moderate_post_status(
  _post_id uuid,
  _new_status public.post_status,
  _moderation_summary text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(_caller, 'admin'::public.app_role)
    OR public.has_role(_caller, 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to moderate posts';
  END IF;

  IF _new_status NOT IN ('pending'::public.post_status, 'approved'::public.post_status, 'rejected'::public.post_status) THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;

  UPDATE public.posts
  SET
    status = _new_status,
    moderation_summary = COALESCE(_moderation_summary, moderation_summary),
    approved_by_user_id = CASE WHEN _new_status = 'approved'::public.post_status THEN _caller ELSE NULL END,
    approved_at = CASE WHEN _new_status = 'approved'::public.post_status THEN now() ELSE NULL END,
    published_at = CASE WHEN _new_status = 'approved'::public.post_status THEN COALESCE(published_at, now()) ELSE published_at END,
    updated_at = now()
  WHERE id = _post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
END;
$$;

-- Allow authenticated users to call safe initializers
GRANT EXECUTE ON FUNCTION public.initialize_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_my_subscription() TO authenticated;

-- Restrict privileged mutators to authenticated (authorization enforced inside functions)
GRANT EXECUTE ON FUNCTION public.assign_user_plan(uuid, public.plan_id) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_post_status(uuid, public.post_status, text) TO authenticated;

-- Fix remaining financial write vulnerabilities

-- 1) wallet_transactions: remove direct user insert
DROP POLICY IF EXISTS wallet_tx_insert_own_or_admin ON public.wallet_transactions;

CREATE POLICY wallet_tx_admin_insert
ON public.wallet_transactions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) post_reads: remove direct user insert with arbitrary earned_amount
DROP POLICY IF EXISTS post_reads_insert_own_or_admin ON public.post_reads;

CREATE POLICY post_reads_admin_insert
ON public.post_reads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.initialize_my_account(
  _name text,
  _email text,
  _phone text,
  _avatar_url text,
  _referred_by_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _safe_name text := coalesce(nullif(trim(_name), ''), 'New User');
  _safe_email text := nullif(trim(_email), '');
  _safe_phone text := nullif(trim(_phone), '');
  _safe_avatar text := nullif(trim(_avatar_url), '');
  _normalized_ref text := nullif(upper(trim(coalesce(_referred_by_code, ''))), '');
  _referral_code text;
  _referrer_user_id uuid;
begin
  if _uid is null then
    raise exception 'Authentication required';
  end if;

  -- Create a unique referral code (retry loop to avoid collisions)
  loop
    _referral_code := upper(regexp_replace(substr(_safe_name, 1, 4), '\s+', '', 'g'))
                      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = _referral_code
    );
  end loop;

  insert into public.profiles (
    user_id,
    email,
    name,
    phone,
    avatar_url,
    bio,
    referral_code,
    referred_by_code
  )
  values (
    _uid,
    _safe_email,
    _safe_name,
    _safe_phone,
    coalesce(_safe_avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || encode(_safe_name::bytea, 'escape')),
    'JobbaWorks Creator',
    _referral_code,
    _normalized_ref
  )
  on conflict (user_id) do update
    set email = coalesce(excluded.email, profiles.email),
        name = coalesce(nullif(excluded.name, ''), profiles.name),
        phone = coalesce(excluded.phone, profiles.phone),
        avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
        referred_by_code = coalesce(profiles.referred_by_code, excluded.referred_by_code),
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (_uid, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  perform public.initialize_my_subscription();
  perform public.initialize_my_wallet();

  if _normalized_ref is not null then
    select p.user_id
      into _referrer_user_id
    from public.profiles p
    where p.referral_code = _normalized_ref
      and p.user_id <> _uid
    limit 1;

    if _referrer_user_id is not null then
      insert into public.referrals (referrer_user_id, referred_user_id, referral_code_used)
      values (_referrer_user_id, _uid, _normalized_ref)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.initialize_my_account(text, text, text, text, text) from public;
grant execute on function public.initialize_my_account(text, text, text, text, text) to authenticated;

-- Promotions table for public promotional campaigns managed by admins
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Learn more',
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_public_read_active" ON public.promotions;
CREATE POLICY "promotions_public_read_active"
ON public.promotions
FOR SELECT
TO public
USING (is_active = true);

DROP POLICY IF EXISTS "promotions_admin_manage" ON public.promotions;
CREATE POLICY "promotions_admin_manage"
ON public.promotions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (is_active, created_at DESC);

DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- SEO metadata support for generated and manually authored posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS seo_meta_title TEXT,
ADD COLUMN IF NOT EXISTS seo_meta_description TEXT;

-- Promote a specific existing user to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = lower('williegabriel58@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- 1) Harden daily counters against user tampering
DROP POLICY IF EXISTS "daily_counters_update_own_or_admin" ON public.daily_user_counters;

CREATE POLICY "daily_counters_update_admin_only"
ON public.daily_user_counters
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Restrict public visibility of system settings to explicitly public rows
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.system_settings
SET is_public = true
WHERE key = 'page_toggles';

DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;

CREATE POLICY "system_settings_public_read"
ON public.system_settings
FOR SELECT
TO public
USING (is_public = true);

-- 3) Prevent fabricated referral relationships
DROP POLICY IF EXISTS "referrals_insert_referred_or_admin" ON public.referrals;

CREATE POLICY "referrals_insert_referred_validated"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    auth.uid() = referred_user_id
    AND referrer_user_id <> referred_user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = referrer_user_id
        AND p.referral_code = referral_code_used
    )
  )
);

-- Payout methods saved by users for withdrawals
CREATE TABLE IF NOT EXISTS public.payout_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('opay','usdt_trc20','minipay')),
  account_name TEXT,
  account_number TEXT,
  wallet_address TEXT,
  minipay_uid TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payout_methods_user_method_unique UNIQUE (user_id, method)
);

ALTER TABLE public.payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_methods_select_own_or_admin"
ON public.payout_methods
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "payout_methods_insert_own_or_admin"
ON public.payout_methods
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "payout_methods_update_own_or_admin"
ON public.payout_methods
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "payout_methods_delete_own_or_admin"
ON public.payout_methods
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER payout_methods_set_updated_at
BEFORE UPDATE ON public.payout_methods
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payout_methods_user_id ON public.payout_methods(user_id);

-- Withdrawal requests for review and processing
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('naira','usdt')),
  method TEXT NOT NULL CHECK (method IN ('opay','usdt_trc20','minipay')),
  payout_method_id UUID REFERENCES public.payout_methods(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawal_requests_select_own_or_admin"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "withdrawal_requests_insert_own_or_admin"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "withdrawal_requests_update_admin_only"
ON public.withdrawal_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER withdrawal_requests_set_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- Dynamic community channel links
CREATE TABLE IF NOT EXISTS public.community_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_links_public_read_active"
ON public.community_links
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "community_links_admin_manage"
ON public.community_links
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER community_links_set_updated_at
BEFORE UPDATE ON public.community_links
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Ensure referral commissions are actually generated on subscription changes
DROP TRIGGER IF EXISTS user_subscriptions_referral_commission_trigger ON public.user_subscriptions;
CREATE TRIGGER user_subscriptions_referral_commission_trigger
AFTER INSERT OR UPDATE OF plan_id
ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_commission();

-- Add new columns to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS monthly_return_cap numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS break_even_day integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS min_referrals integer NOT NULL DEFAULT 0;

-- Update the seed data with the new plan structures and logic
UPDATE public.subscription_plans 
SET daily_read_limit = 3, read_reward = 0, daily_comment_limit = 1, comment_reward = 0, monthly_return_cap = 0, break_even_day = 30, min_referrals = 0
WHERE id = 'free';

UPDATE public.subscription_plans 
SET daily_read_limit = 6, read_reward = 6, daily_comment_limit = 6, comment_reward = 4, monthly_return_cap = 3000, break_even_day = 18, min_referrals = 10
WHERE id = 'starter';

UPDATE public.subscription_plans 
SET daily_read_limit = 8, read_reward = 12, daily_comment_limit = 8, comment_reward = 7, monthly_return_cap = 9000, break_even_day = 17, min_referrals = 8
WHERE id = 'pro';

UPDATE public.subscription_plans 
SET daily_read_limit = 10, read_reward = 22, daily_comment_limit = 10, comment_reward = 12, monthly_return_cap = 15000, break_even_day = 16, min_referrals = 8
WHERE id = 'elite';

UPDATE public.subscription_plans 
SET daily_read_limit = 12, read_reward = 40, daily_comment_limit = 12, comment_reward = 23, monthly_return_cap = 28000, break_even_day = 15, min_referrals = 8
WHERE id = 'vip';

UPDATE public.subscription_plans 
SET daily_read_limit = 15, read_reward = 70, daily_comment_limit = 20, comment_reward = 50, monthly_return_cap = 70000, break_even_day = 14, min_referrals = 6
WHERE id = 'executive';

UPDATE public.subscription_plans 
SET daily_read_limit = 18, read_reward = 120, daily_comment_limit = 25, comment_reward = 100, monthly_return_cap = 140000, break_even_day = 14, min_referrals = 6
WHERE id = 'platinum';


-- Add tracking to user_subscriptions for 'plan_earnings' to track vs 'monthly_return_cap'
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS plan_earnings numeric(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_completed boolean NOT NULL DEFAULT false;

-- Update credit_wallet to track plan_earnings
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid,
  _amount numeric,
  _type public.transaction_type,
  _description text,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, balance, total_earnings, pending_rewards)
  VALUES (_user_id, _amount, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = public.wallet_balances.balance + EXCLUDED.balance,
      total_earnings = public.wallet_balances.total_earnings + EXCLUDED.total_earnings,
      pending_rewards = public.wallet_balances.pending_rewards + EXCLUDED.pending_rewards,
      updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (_user_id, _amount, _type, 'completed', _description, COALESCE(_meta, '{}'::jsonb));

  IF _type = 'reading_reward' OR _type = 'comment_reward' THEN
    UPDATE public.user_subscriptions
    SET plan_earnings = plan_earnings + _amount,
        updated_at = now()
    WHERE user_id = _user_id;

    -- Check if plan maxed out
    UPDATE public.user_subscriptions us
    SET is_completed = true
    FROM public.subscription_plans sp
    WHERE us.plan_id = sp.id
      AND us.user_id = _user_id
      AND sp.monthly_return_cap > 0
      AND us.plan_earnings >= sp.monthly_return_cap;
  END IF;
END;
$$;


-- Reading reward claim update to stop earnings if over cap
CREATE OR REPLACE FUNCTION public.claim_post_read(_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id public.plan_id;
  _reward numeric;
  _read_limit integer;
  _return_cap numeric;
  _counter public.daily_user_counters;
  _plan_earnings numeric;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.post_reads
    WHERE user_id = _uid AND post_id = _post_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already earned from this post.', 'amount', 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.posts WHERE id = _post_id AND status = 'approved'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Post is not eligible for rewards.', 'amount', 0);
  END IF;

  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings
  FROM public.user_subscriptions
  WHERE user_id = _uid;

  IF _plan_id IS NULL THEN
    _plan_id := 'free';
    _plan_earnings := 0;
  END IF;

  SELECT read_reward, daily_read_limit, monthly_return_cap
  INTO _reward, _read_limit, _return_cap
  FROM public.subscription_plans
  WHERE id = _plan_id;

  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', false, 'message', 'Your plan has reached its monthly Return Cap. Upgrade to continue earning.', 'amount', 0);
  END IF;

  _counter := public.ensure_daily_counter(_uid);

  IF _counter.read_count >= _read_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily earning limit reached. You can still read posts but earnings will resume tomorrow.', 'amount', 0);
  END IF;

  INSERT INTO public.post_reads(user_id, post_id, earned_amount)
  VALUES (_uid, _post_id, _reward);

  UPDATE public.daily_user_counters
  SET read_count = read_count + 1,
      updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(
    _uid,
    _reward,
    'reading_reward',
    'Article Consumption Reward',
    jsonb_build_object('post_id', _post_id)
  );

  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for reading.', _reward), 'amount', _reward);
END;
$$;


-- Comment reward claim update to stop earnings if over cap
CREATE OR REPLACE FUNCTION public.submit_comment_with_reward(_post_id uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan_id public.plan_id;
  _reward numeric;
  _comment_limit integer;
  _return_cap numeric;
  _counter public.daily_user_counters;
  _plan_earnings numeric;
  _comment_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.post_comments(post_id, user_id, content)
  VALUES (_post_id, _uid, _content)
  RETURNING id INTO _comment_id;

  IF EXISTS (
    SELECT 1 FROM public.comment_earnings
    WHERE user_id = _uid AND post_id = _post_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted successfully. You already claimed comment earnings from this post.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings
  FROM public.user_subscriptions
  WHERE user_id = _uid;

  IF _plan_id IS NULL THEN
    _plan_id := 'free';
    _plan_earnings := 0;
  END IF;

  SELECT comment_reward, daily_comment_limit, monthly_return_cap
  INTO _reward, _comment_limit, _return_cap
  FROM public.subscription_plans
  WHERE id = _plan_id;

  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted successfully. Your plan has reached its monthly Return Cap.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  _counter := public.ensure_daily_counter(_uid);

  IF _counter.comment_count >= _comment_limit THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted successfully. Daily comment earning limit reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  INSERT INTO public.comment_earnings(user_id, post_id, comment_id, earned_amount)
  VALUES (_uid, _post_id, _comment_id, _reward);

  UPDATE public.daily_user_counters
  SET comment_count = comment_count + 1,
      updated_at = now()
  WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(
    _uid,
    _reward,
    'comment_reward',
    'Community Discussion Reward',
    jsonb_build_object('post_id', _post_id, 'comment_id', _comment_id)
  );

  RETURN jsonb_build_object('success', true, 'message', format('₦%s earned for commenting.', _reward), 'amount', _reward, 'comment_id', _comment_id);
END;
$$;


-- Function to explicitly handle upgrades gracefully and reset plan metrics
CREATE OR REPLACE FUNCTION public.process_plan_upgrade(_user_id uuid, _new_plan_id public.plan_id)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset counters for today so they can use new limits immediately
  UPDATE public.daily_user_counters
  SET read_count = 0,
      comment_count = 0,
      updated_at = now()
  WHERE user_id = _user_id AND counter_date = CURRENT_DATE;

  -- Update subscription and reset plan earnings to zero
  UPDATE public.user_subscriptions
  SET plan_id = _new_plan_id,
      started_at = now(),
      plan_earnings = 0,
      is_completed = false,
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;


-- Update the subscription_plans backend table with new rules

UPDATE public.subscription_plans 
SET daily_read_limit = 5, read_reward = 0, daily_comment_limit = 2, comment_reward = 0, monthly_return_cap = 0, break_even_day = 30, min_referrals = 10
WHERE id = 'free';

UPDATE public.subscription_plans 
SET daily_read_limit = 6, read_reward = 6, daily_comment_limit = 6, comment_reward = 4, monthly_return_cap = 1500, break_even_day = 18, min_referrals = 10
WHERE id = 'starter';

UPDATE public.subscription_plans 
SET daily_read_limit = 8, read_reward = 12, daily_comment_limit = 8, comment_reward = 7, monthly_return_cap = 4428, break_even_day = 17, min_referrals = 8
WHERE id = 'pro';

UPDATE public.subscription_plans 
SET daily_read_limit = 10, read_reward = 22, daily_comment_limit = 10, comment_reward = 12, monthly_return_cap = 9680, break_even_day = 16, min_referrals = 8
WHERE id = 'elite';

UPDATE public.subscription_plans 
SET daily_read_limit = 12, read_reward = 40, daily_comment_limit = 12, comment_reward = 23, monthly_return_cap = 25376, break_even_day = 15, min_referrals = 8
WHERE id = 'vip';

UPDATE public.subscription_plans 
SET daily_read_limit = 15, read_reward = 70, daily_comment_limit = 20, comment_reward = 50, monthly_return_cap = 57150, break_even_day = 14, min_referrals = 6
WHERE id = 'executive';

UPDATE public.subscription_plans 
SET daily_read_limit = 18, read_reward = 120, daily_comment_limit = 25, comment_reward = 100, monthly_return_cap = 140000, break_even_day = 14, min_referrals = 6
WHERE id = 'platinum';


UPDATE public.subscription_plans 
SET daily_read_limit = 5, read_reward = 10, daily_comment_limit = 4, comment_reward = 10, monthly_return_cap = 2700, break_even_day = 30, min_referrals = 10
WHERE id = 'free';


CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    reward_amount NUMERIC DEFAULT 0,
    target_count INTEGER DEFAULT 1,
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    reward_claimed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- Insert dummy data
INSERT INTO public.tasks (title, description, reward_amount, target_count, task_type) 
VALUES 
('Refer 5 friends today', 'Invite 5 new users using your referral link today and get a massive bonus.', 5000, 5, 'referrals'),
('Read 10 Articles', 'Complete reading 10 premium articles today.', 500, 10, 'reads');

-- Function to handle claiming
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_task_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_reward NUMERIC;
  v_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get task info
  SELECT reward_amount INTO v_reward FROM public.tasks WHERE id = p_task_id AND status = 'active';
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Task not found or inactive');
  END IF;

  -- Check if already claimed
  SELECT reward_claimed INTO v_claimed FROM public.user_tasks WHERE user_id = v_user_id AND task_id = p_task_id;
  
  IF v_claimed THEN
    RETURN json_build_object('success', false, 'message', 'Reward already claimed');
  END IF;

  -- Mark as claimed
  INSERT INTO public.user_tasks (user_id, task_id, progress, completed, reward_claimed)
  VALUES (v_user_id, p_task_id, 1, true, true)
  ON CONFLICT (user_id, task_id) DO UPDATE SET completed = true, reward_claimed = true, updated_at = NOW();

  -- Credit wallet
  UPDATE public.wallet_balances
  SET total_earnings = total_earnings + v_reward,
      balance = balance + v_reward
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (v_user_id, v_reward, 'task_reward', 'completed', 'Completed Task Reward');

  RETURN json_build_object('success', true, 'message', 'Task reward claimed successfully');
END;
$$;


-- Create promotions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Read Access on Promotions Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotions');

-- Policies for authenticated inserts
CREATE POLICY "Authenticated users can upload promotions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promotions' AND auth.role() = 'authenticated');


-- Add new columns to the tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS required_plan TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;


-- Create post_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Read Access on Post Images Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'post_images');

-- Policies for authenticated inserts
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post_images' AND auth.role() = 'authenticated');


-- Add is_story column to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_story BOOLEAN DEFAULT false;


ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_earnings_claimed BOOLEAN DEFAULT false;


ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;


DROP FUNCTION IF EXISTS public.initialize_my_account(text, text, text, text, text);

create or replace function public.initialize_my_account(
  _name text,
  _email text,
  _phone text,
  _username text,
  _gender text,
  _avatar_url text,
  _referred_by_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _safe_name text := coalesce(nullif(trim(_name), ''), 'New User');
  _safe_email text := nullif(trim(_email), '');
  _safe_phone text := nullif(trim(_phone), '');
  _safe_username text := nullif(trim(_username), '');
  _safe_gender text := nullif(trim(_gender), '');
  _safe_avatar text := nullif(trim(_avatar_url), '');
  _normalized_ref text := nullif(upper(trim(coalesce(_referred_by_code, ''))), '');
  _referral_code text;
  _referrer_user_id uuid;
begin
  if _uid is null then
    raise exception 'Authentication required';
  end if;

  loop
    _referral_code := upper(regexp_replace(substr(_safe_name, 1, 4), '\s+', '', 'g'))
                      || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    exit when not exists (
      select 1 from public.profiles p where p.referral_code = _referral_code
    );
  end loop;

  insert into public.profiles (
    user_id,
    email,
    name,
    username,
    gender,
    phone,
    avatar_url,
    bio,
    referral_code,
    referred_by_code
  )
  values (
    _uid,
    _safe_email,
    _safe_name,
    _safe_username,
    _safe_gender,
    _safe_phone,
    coalesce(_safe_avatar, 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || encode(_safe_name::bytea, 'escape')),
    'JobbaWorks Creator',
    _referral_code,
    _normalized_ref
  )
  on conflict (user_id) do update
    set email = coalesce(excluded.email, profiles.email),
        name = coalesce(nullif(excluded.name, ''), profiles.name),
        username = coalesce(nullif(excluded.username, ''), profiles.username),
        gender = coalesce(nullif(excluded.gender, ''), profiles.gender),
        phone = coalesce(excluded.phone, profiles.phone),
        avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
        referred_by_code = coalesce(profiles.referred_by_code, excluded.referred_by_code),
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (_uid, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;

  perform public.initialize_my_subscription();
  perform public.initialize_my_wallet();

  if _normalized_ref is not null then
    select p.user_id
      into _referrer_user_id
    from public.profiles p
    where p.referral_code = _normalized_ref
      and p.user_id <> _uid
    limit 1;

    if _referrer_user_id is not null then
      insert into public.referrals (referrer_user_id, referred_user_id, referral_code_used)
      values (_referrer_user_id, _uid, _normalized_ref)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;
end;
$$;

revoke all on function public.initialize_my_account(text, text, text, text, text, text, text) from public;
grant execute on function public.initialize_my_account(text, text, text, text, text, text, text) to authenticated;


CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_insert_admin"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


-- Ensure tasks table has proper RLS policies for reading and writing
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public read tasks" ON public.tasks;
    DROP POLICY IF EXISTS "Allow admin write tasks" ON public.tasks;
    
    DROP POLICY IF EXISTS "Allow users to see their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow users to update their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow users to insert their own tasks" ON public.user_tasks;
    DROP POLICY IF EXISTS "Allow admin all user tasks" ON public.user_tasks;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;


CREATE POLICY "Allow public read tasks" ON public.tasks 
FOR SELECT USING (true);

CREATE POLICY "Allow admin write tasks" ON public.tasks 
FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own tasks" ON public.user_tasks 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Allow users to insert their own tasks" ON public.user_tasks 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to update their own tasks" ON public.user_tasks 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Allow admin all user tasks" ON public.user_tasks 
FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));


-- Allow public access to read profile names, fixing missing names on articles and referrals page
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
EXCEPTION
    WHEN undefined_object THEN
        NULL;
END $$;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);


-- Add unique constraint on payout methods to allow upsert and add payout_pin to profiles
ALTER TABLE public.payout_methods DROP CONSTRAINT IF EXISTS payout_methods_userid_method_key;
ALTER TABLE public.payout_methods ADD CONSTRAINT payout_methods_userid_method_key UNIQUE (user_id, method);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_pin text;



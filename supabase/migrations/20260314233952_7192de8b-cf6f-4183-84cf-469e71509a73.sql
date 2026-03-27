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
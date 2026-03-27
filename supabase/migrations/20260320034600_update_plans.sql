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

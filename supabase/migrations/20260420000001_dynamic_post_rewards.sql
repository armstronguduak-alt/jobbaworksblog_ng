-- =========================================================
-- DYNAMIC GLOBAL REWARDS FOR READING AND COMMENTING
-- =========================================================

DROP FUNCTION IF EXISTS public.claim_post_read(uuid);

CREATE OR REPLACE FUNCTION public.claim_post_read(_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan_id       public.plan_id;
  v_reward        numeric;
  v_read_limit    integer;
  v_return_cap    numeric;
  v_counter       public.daily_user_counters;
  v_plan_earnings numeric;
  v_locked_val    jsonb;
  v_is_locked     boolean := false;
  v_is_global     boolean := false;
  v_global_plans  jsonb;
  v_exchange      jsonb;
  v_dollar_price  numeric := 1500;
  v_currency      text := 'NGN';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ss.value INTO v_locked_val FROM public.system_settings ss WHERE ss.key = 'platform_lockdown';
  IF v_locked_val IS NOT NULL AND v_locked_val ? 'locked' THEN
    v_is_locked := (v_locked_val->>'locked')::boolean;
  END IF;

  IF v_is_locked = true THEN
    RETURN jsonb_build_object('success', false, 'message', 'Platform rewards temporarily suspended.', 'amount', 0);
  END IF;

  IF EXISTS (SELECT 1 FROM public.post_reads pr WHERE pr.user_id = v_uid AND pr.post_id = _post_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already earned from this post.', 'amount', 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts po WHERE po.id = _post_id AND po.status = 'approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Post not eligible for rewards.', 'amount', 0);
  END IF;

  SELECT us.plan_id, us.plan_earnings INTO v_plan_id, v_plan_earnings FROM public.user_subscriptions us WHERE us.user_id = v_uid;
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
    v_plan_earnings := 0;
  END IF;

  SELECT sp.read_reward, sp.daily_read_limit, sp.monthly_return_cap INTO v_reward, v_read_limit, v_return_cap FROM public.subscription_plans sp WHERE sp.id = v_plan_id;

  SELECT p.is_global INTO v_is_global FROM public.profiles p WHERE p.user_id = v_uid;
  v_is_global := COALESCE(v_is_global, false);

  IF v_is_global THEN
    v_currency := 'USD';
    SELECT ss.value INTO v_global_plans FROM public.system_settings ss WHERE ss.key = 'non_nigerian_plans';
    SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';

    IF v_exchange IS NOT NULL AND v_exchange ? 'dollarPrice' THEN
      v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
    END IF;

    IF v_global_plans IS NOT NULL AND v_global_plans ? v_plan_id THEN
      v_reward := COALESCE((v_global_plans->v_plan_id->>'usdReadReward')::numeric, 0) * v_dollar_price;
    ELSE
      v_reward := 0;
    END IF;
  END IF;

  IF v_return_cap > 0 AND v_plan_earnings >= v_return_cap THEN
    RETURN jsonb_build_object('success', false, 'message', 'Monthly Return Cap reached. Upgrade to continue earning.', 'amount', 0);
  END IF;

  v_counter := public.ensure_daily_counter(v_uid);
  IF v_counter.read_count >= v_read_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached. Earnings resume tomorrow.', 'amount', 0);
  END IF;

  INSERT INTO public.post_reads(user_id, post_id, earned_amount) VALUES (v_uid, _post_id, v_reward);
  UPDATE public.daily_user_counters SET read_count = read_count + 1, updated_at = now() WHERE user_id = v_uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(v_uid, v_reward, 'reading_reward', 'Article Consumption Reward', jsonb_build_object('post_id', _post_id, 'is_global', v_is_global, 'currency', v_currency));
  PERFORM public.credit_author_earnings(_post_id, v_uid);

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_is_global THEN format('$%s USD earned for reading.', ROUND(v_reward / v_dollar_price, 2)) ELSE format('₦%s earned for reading.', v_reward) END,
    'amount', v_reward
  );
END;
$$;


DROP FUNCTION IF EXISTS public.submit_comment_with_reward(uuid, text);

CREATE OR REPLACE FUNCTION public.submit_comment_with_reward(_post_id uuid, _content text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan_id       public.plan_id;
  v_reward        numeric;
  v_comment_limit integer;
  v_return_cap    numeric;
  v_counter       public.daily_user_counters;
  v_plan_earnings numeric;
  v_comment_id    uuid;
  v_locked_val    jsonb;
  v_is_locked     boolean := false;
  v_is_global     boolean := false;
  v_global_plans  jsonb;
  v_exchange      jsonb;
  v_dollar_price  numeric := 1500;
  v_currency      text := 'NGN';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ss.value INTO v_locked_val FROM public.system_settings ss WHERE ss.key = 'platform_lockdown';
  IF v_locked_val IS NOT NULL AND v_locked_val ? 'locked' THEN
    v_is_locked := (v_locked_val->>'locked')::boolean;
  END IF;

  INSERT INTO public.post_comments(post_id, user_id, content) VALUES (_post_id, v_uid, _content) RETURNING id INTO v_comment_id;

  IF v_is_locked = true THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Rewards temporarily suspended.', 'amount', 0, 'comment_id', v_comment_id);
  END IF;

  IF EXISTS (SELECT 1 FROM public.comment_earnings ce WHERE ce.user_id = v_uid AND ce.post_id = _post_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. You already claimed comment earnings from this post.', 'amount', 0, 'comment_id', v_comment_id);
  END IF;

  SELECT us.plan_id, us.plan_earnings INTO v_plan_id, v_plan_earnings FROM public.user_subscriptions us WHERE us.user_id = v_uid;
  IF v_plan_id IS NULL THEN
    v_plan_id := 'free';
    v_plan_earnings := 0;
  END IF;

  SELECT sp.comment_reward, sp.daily_comment_limit, sp.monthly_return_cap INTO v_reward, v_comment_limit, v_return_cap FROM public.subscription_plans sp WHERE sp.id = v_plan_id;

  SELECT p.is_global INTO v_is_global FROM public.profiles p WHERE p.user_id = v_uid;
  v_is_global := COALESCE(v_is_global, false);

  IF v_is_global THEN
    v_currency := 'USD';
    SELECT ss.value INTO v_global_plans FROM public.system_settings ss WHERE ss.key = 'non_nigerian_plans';
    SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';

    IF v_exchange IS NOT NULL AND v_exchange ? 'dollarPrice' THEN
      v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
    END IF;

    IF v_global_plans IS NOT NULL AND v_global_plans ? v_plan_id THEN
      v_reward := COALESCE((v_global_plans->v_plan_id->>'usdCommentReward')::numeric, 0) * v_dollar_price;
    ELSE
      v_reward := 0;
    END IF;
  END IF;

  IF v_return_cap > 0 AND v_plan_earnings >= v_return_cap THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Monthly cap reached.', 'amount', 0, 'comment_id', v_comment_id);
  END IF;

  v_counter := public.ensure_daily_counter(v_uid);
  IF v_counter.comment_count >= v_comment_limit THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Daily comment limit reached.', 'amount', 0, 'comment_id', v_comment_id);
  END IF;

  INSERT INTO public.comment_earnings(user_id, post_id, comment_id, earned_amount) VALUES (v_uid, _post_id, v_comment_id, v_reward);
  UPDATE public.daily_user_counters SET comment_count = comment_count + 1, updated_at = now() WHERE user_id = v_uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(v_uid, v_reward, 'comment_reward', 'Community Discussion Reward', jsonb_build_object('post_id', _post_id, 'comment_id', v_comment_id, 'is_global', v_is_global, 'currency', v_currency));

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_is_global THEN format('Comment posted. $%s USD earned!', ROUND(v_reward / v_dollar_price, 2)) ELSE format('Comment posted. ₦%s earned!', v_reward) END,
    'amount', v_reward,
    'comment_id', v_comment_id
  );
END;
$$;

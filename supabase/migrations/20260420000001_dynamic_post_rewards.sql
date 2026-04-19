-- =========================================================
-- DYNAMIC GLOBAL REWARDS FOR REPORTING AND COMMENTING
-- =========================================================

-- UPDATED claim_post_read — respects global rewards
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
  _is_global     boolean;
  _global_plans  jsonb;
  _exchange      jsonb;
  _dollar_price  numeric := 1500;
  _currency      text := 'NGN';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  
  -- Check lockdown
  SELECT (value->>'locked')::boolean INTO _is_locked FROM public.system_settings WHERE key = 'platform_lockdown';
  IF _is_locked = true THEN
    RETURN jsonb_build_object('success', false, 'message', 'Platform rewards temporarily suspended.', 'amount', 0);
  END IF;

  IF EXISTS (SELECT 1 FROM public.post_reads WHERE user_id = _uid AND post_id = _post_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'You already earned from this post.', 'amount', 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.posts WHERE id = _post_id AND status = 'approved') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Post not eligible for rewards.', 'amount', 0);
  END IF;

  -- Get Plan Context
  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings FROM public.user_subscriptions WHERE user_id = _uid;
  IF _plan_id IS NULL THEN _plan_id := 'free'; _plan_earnings := 0; END IF;

  SELECT read_reward, daily_read_limit, monthly_return_cap INTO _reward, _read_limit, _return_cap FROM public.subscription_plans WHERE id = _plan_id;
  
  -- Determine Nationality & Currency overrides
  SELECT is_global INTO _is_global FROM public.profiles WHERE user_id = _uid;
  _is_global := COALESCE(_is_global, false);

  IF _is_global THEN
    _currency := 'USD';
    SELECT value INTO _global_plans FROM public.system_settings WHERE key = 'non_nigerian_plans';
    SELECT value INTO _exchange FROM public.system_settings WHERE key = 'exchange_rates';
    
    IF _exchange IS NOT NULL AND _exchange ? 'dollarPrice' THEN
      _dollar_price := (_exchange->>'dollarPrice')::numeric;
    END IF;

    IF _global_plans IS NOT NULL AND _global_plans ? _plan_id THEN
      -- use global configured USD reward
      _reward := COALESCE((_global_plans->_plan_id->>'usdReadReward')::numeric, 0) * _dollar_price;
    ELSE
      _reward := 0; -- Fallback
    END IF;
  END IF;

  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', false, 'message', 'Monthly Return Cap reached. Upgrade to continue earning.', 'amount', 0);
  END IF;

  _counter := public.ensure_daily_counter(_uid);
  IF _counter.read_count >= _read_limit THEN
    RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached. Earnings resume tomorrow.', 'amount', 0);
  END IF;

  INSERT INTO public.post_reads(user_id, post_id, earned_amount) VALUES (_uid, _post_id, _reward);
  UPDATE public.daily_user_counters SET read_count = read_count + 1, updated_at = now() WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(_uid, _reward, 'reading_reward', 'Article Consumption Reward', jsonb_build_object('post_id', _post_id, 'is_global', _is_global, 'currency', _currency));
  PERFORM public.credit_author_earnings(_post_id, _uid);

  RETURN jsonb_build_object(
    'success', true, 
    'message', CASE WHEN _is_global THEN format('$%s USD earned for reading.', ROUND(_reward / _dollar_price, 2)) ELSE format('₦%s earned for reading.', _reward) END, 
    'amount', _reward
  );
END;
$$;


-- UPDATED submit_comment_with_reward — respects global rewards
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
  _is_global     boolean;
  _global_plans  jsonb;
  _exchange      jsonb;
  _dollar_price  numeric := 1500;
  _currency      text := 'NGN';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  
  SELECT (value->>'locked')::boolean INTO _is_locked FROM public.system_settings WHERE key = 'platform_lockdown';
  
  INSERT INTO public.post_comments(post_id, user_id, content) VALUES (_post_id, _uid, _content) RETURNING id INTO _comment_id;
  
  IF _is_locked = true THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Rewards temporarily suspended.', 'amount', 0, 'comment_id', _comment_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.comment_earnings WHERE user_id = _uid AND post_id = _post_id) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. You already claimed comment earnings from this post.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  SELECT plan_id, plan_earnings INTO _plan_id, _plan_earnings FROM public.user_subscriptions WHERE user_id = _uid;
  IF _plan_id IS NULL THEN _plan_id := 'free'; _plan_earnings := 0; END IF;

  SELECT comment_reward, daily_comment_limit, monthly_return_cap INTO _reward, _comment_limit, _return_cap FROM public.subscription_plans WHERE id = _plan_id;
  
  -- Determine Nationality & Currency overrides
  SELECT is_global INTO _is_global FROM public.profiles WHERE user_id = _uid;
  _is_global := COALESCE(_is_global, false);

  IF _is_global THEN
    _currency := 'USD';
    SELECT value INTO _global_plans FROM public.system_settings WHERE key = 'non_nigerian_plans';
    SELECT value INTO _exchange FROM public.system_settings WHERE key = 'exchange_rates';
    
    IF _exchange IS NOT NULL AND _exchange ? 'dollarPrice' THEN
      _dollar_price := (_exchange->>'dollarPrice')::numeric;
    END IF;

    IF _global_plans IS NOT NULL AND _global_plans ? _plan_id THEN
      -- use global configured USD reward
      _reward := COALESCE((_global_plans->_plan_id->>'usdCommentReward')::numeric, 0) * _dollar_price;
    ELSE
      _reward := 0; -- Fallback
    END IF;
  END IF;

  IF _return_cap > 0 AND _plan_earnings >= _return_cap THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Monthly cap reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  _counter := public.ensure_daily_counter(_uid);
  IF _counter.comment_count >= _comment_limit THEN
    RETURN jsonb_build_object('success', true, 'message', 'Comment posted. Daily comment limit reached.', 'amount', 0, 'comment_id', _comment_id);
  END IF;

  INSERT INTO public.comment_earnings(user_id, post_id, comment_id, earned_amount) VALUES (_uid, _post_id, _comment_id, _reward);
  UPDATE public.daily_user_counters SET comment_count = comment_count + 1, updated_at = now() WHERE user_id = _uid AND counter_date = CURRENT_DATE;

  PERFORM public.credit_wallet(_uid, _reward, 'comment_reward', 'Community Discussion Reward', jsonb_build_object('post_id', _post_id, 'comment_id', _comment_id, 'is_global', _is_global, 'currency', _currency));

  RETURN jsonb_build_object(
    'success', true, 
    'message', CASE WHEN _is_global THEN format('Comment posted. $%s USD earned!', ROUND(_reward / _dollar_price, 2)) ELSE format('Comment posted. ₦%s earned!', _reward) END, 
    'amount', _reward, 
    'comment_id', _comment_id
  );
END;
$$;

-- =========================================================
-- APPLY PLATFORM LOCKDOWN TO REMAINING EARNING FUNCTIONS
-- =========================================================

-- 1. claim_task_reward
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_task_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_reward NUMERIC;
  v_claimed BOOLEAN;
  v_locked_val jsonb;
  v_is_locked boolean := false;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Not authenticated'); END IF;

  SELECT ss.value INTO v_locked_val FROM public.system_settings ss WHERE ss.key = 'platform_lockdown';
  IF v_locked_val IS NOT NULL AND v_locked_val ? 'locked' THEN
    v_is_locked := (v_locked_val->>'locked')::boolean;
  END IF;

  IF v_is_locked = true THEN
    RETURN json_build_object('success', false, 'message', 'Platform rewards temporarily suspended.', 'amount', 0);
  END IF;
  
  v_reward := (SELECT reward_amount FROM public.tasks WHERE id = p_task_id AND status = 'active');
  IF v_reward IS NULL THEN RETURN json_build_object('success', false, 'message', 'Task not found or inactive'); END IF;
  
  v_claimed := (SELECT reward_claimed FROM public.user_tasks WHERE user_id = v_user_id AND task_id = p_task_id);
  IF v_claimed THEN RETURN json_build_object('success', false, 'message', 'Reward already claimed'); END IF;
  
  INSERT INTO public.user_tasks (user_id, task_id, progress, completed, reward_claimed)
  VALUES (v_user_id, p_task_id, 1, true, true)
  ON CONFLICT (user_id, task_id) DO UPDATE SET completed = true, reward_claimed = true, updated_at = NOW();
  
  UPDATE public.wallet_balances 
  SET total_earnings = total_earnings + v_reward, 
      balance = balance + v_reward,
      task_earnings = COALESCE(task_earnings, 0) + v_reward
  WHERE user_id = v_user_id;
  
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (v_user_id, v_reward, 'task_reward', 'completed', 'Completed Task Reward');
  
  RETURN json_build_object('success', true, 'message', 'Task reward claimed successfully');
END;
$$;


-- 2. claim_daily_login_reward
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := CURRENT_DATE;
  v_new_streak integer;
  v_reward numeric;
  v_plan_id text;
  v_is_global boolean;
  v_min_reward numeric;
  v_max_reward numeric;
  v_currency text;
  v_settings jsonb;
  v_exchange jsonb;
  v_dollar_price numeric := 1500;
  v_plan_settings jsonb;
  v_streak_cur integer;
  v_streak_last date;
  v_streak_earnings numeric;
  v_locked_val jsonb;
  v_is_locked boolean := false;
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

  SELECT p.is_global INTO v_is_global FROM public.profiles p WHERE p.user_id = v_uid;
  v_is_global := COALESCE(v_is_global, false);

  SELECT us.plan_id INTO v_plan_id FROM public.user_subscriptions us WHERE us.user_id = v_uid;
  v_plan_id := COALESCE(v_plan_id, 'free');

  SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';
  IF v_exchange IS NOT NULL AND v_exchange ? 'dollarPrice' THEN
    v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
  END IF;

  SELECT ss.value INTO v_settings FROM public.system_settings ss WHERE ss.key = 'streak_settings';

  IF v_settings IS NOT NULL AND v_settings ? v_plan_id THEN
    v_plan_settings := v_settings->v_plan_id;
    IF v_is_global THEN
      v_currency := 'USD';
      v_min_reward := (v_plan_settings->>'usdMin')::numeric * v_dollar_price;
      v_max_reward := (v_plan_settings->>'usdMax')::numeric * v_dollar_price;
    ELSE
      v_currency := 'NGN';
      v_min_reward := (v_plan_settings->>'ngnMin')::numeric;
      v_max_reward := (v_plan_settings->>'ngnMax')::numeric;
    END IF;
  ELSE
    IF v_is_global THEN
      v_currency := 'USD';
      CASE v_plan_id
        WHEN 'free'      THEN v_min_reward := 0.20 * v_dollar_price;  v_max_reward := 0.50 * v_dollar_price;
        WHEN 'starter'   THEN v_min_reward := 0.50 * v_dollar_price;  v_max_reward := 1.00 * v_dollar_price;
        WHEN 'pro'       THEN v_min_reward := 1.00 * v_dollar_price;  v_max_reward := 3.00 * v_dollar_price;
        WHEN 'elite'     THEN v_min_reward := 1.00 * v_dollar_price;  v_max_reward := 5.00 * v_dollar_price;
        WHEN 'vip'       THEN v_min_reward := 2.00 * v_dollar_price;  v_max_reward := 8.00 * v_dollar_price;
        WHEN 'executive' THEN v_min_reward := 3.00 * v_dollar_price;  v_max_reward := 15.00 * v_dollar_price;
        WHEN 'platinum'  THEN v_min_reward := 10.00 * v_dollar_price; v_max_reward := 30.00 * v_dollar_price;
        ELSE                  v_min_reward := 0.20 * v_dollar_price;  v_max_reward := 0.50 * v_dollar_price;
      END CASE;
    ELSE
      v_currency := 'NGN';
      CASE v_plan_id
        WHEN 'free'      THEN v_min_reward := 10;     v_max_reward := 500;
        WHEN 'starter'   THEN v_min_reward := 100;    v_max_reward := 500;
        WHEN 'pro'       THEN v_min_reward := 160;    v_max_reward := 1000;
        WHEN 'elite'     THEN v_min_reward := 200;    v_max_reward := 14500;
        WHEN 'vip'       THEN v_min_reward := 300;    v_max_reward := 22500;
        WHEN 'executive' THEN v_min_reward := 500;    v_max_reward := 13500;
        WHEN 'platinum'  THEN v_min_reward := 1000;   v_max_reward := 5000;
        ELSE                  v_min_reward := 10;     v_max_reward := 500;
      END CASE;
    END IF;
  END IF;

  v_reward := ROUND((v_min_reward + random() * (v_max_reward - v_min_reward))::numeric, 2);

  SELECT dls.current_streak, dls.last_claimed_date, dls.total_streak_earnings
  INTO v_streak_cur, v_streak_last, v_streak_earnings
  FROM public.daily_login_streaks dls WHERE dls.user_id = v_uid;

  IF NOT FOUND THEN
    v_new_streak := 1;
    INSERT INTO public.daily_login_streaks (user_id, current_streak, last_login_date, last_claimed_date, total_streak_earnings)
    VALUES (v_uid, v_new_streak, v_today, v_today, v_reward);
  ELSIF v_streak_last = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already claimed today''s login reward!',
      'current_streak', v_streak_cur,
      'reward', 0,
      'already_claimed', true,
      'currency', v_currency
    );
  ELSIF v_streak_last = v_today - 1 THEN
    IF v_streak_cur >= 7 THEN
      v_new_streak := 1;
    ELSE
      v_new_streak := v_streak_cur + 1;
    END IF;
    UPDATE public.daily_login_streaks
    SET current_streak = v_new_streak,
        last_login_date = v_today,
        last_claimed_date = v_today,
        total_streak_earnings = total_streak_earnings + v_reward,
        updated_at = now()
    WHERE user_id = v_uid;
  ELSE
    v_new_streak := 1;
    UPDATE public.daily_login_streaks
    SET current_streak = v_new_streak,
        last_login_date = v_today,
        last_claimed_date = v_today,
        total_streak_earnings = total_streak_earnings + v_reward,
        updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  UPDATE public.wallet_balances
  SET balance = balance + v_reward,
      total_earnings = total_earnings + v_reward,
      updated_at = now()
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
    VALUES (v_uid, v_reward, v_reward);
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (
    v_uid,
    v_reward,
    'login_reward',
    'completed',
    CASE WHEN v_is_global
      THEN format('Day %s Streak — $%s USD reward', v_new_streak, ROUND(v_reward / v_dollar_price, 2))
      ELSE format('Day %s Streak — ₦%s reward', v_new_streak, v_reward)
    END,
    jsonb_build_object(
      'streak_day', v_new_streak,
      'plan_id', v_plan_id,
      'currency', v_currency,
      'is_global', v_is_global,
      'min_range', v_min_reward,
      'max_range', v_max_reward
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN v_is_global
      THEN format('$%s USD earned for Day %s login streak!', ROUND(v_reward / v_dollar_price, 2), v_new_streak)
      ELSE format('₦%s earned for Day %s login streak!', v_reward, v_new_streak)
    END,
    'current_streak', v_new_streak,
    'reward', v_reward,
    'already_claimed', false,
    'currency', v_currency,
    'plan_id', v_plan_id,
    'is_global', v_is_global
  );
END;
$$;

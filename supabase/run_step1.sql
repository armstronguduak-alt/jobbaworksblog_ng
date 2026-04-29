-- STEP 1: NEW CLAIM DAILY LOGIN REWARD FUNCTION
-- Run this in Supabase SQL Editor

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
  v_currency text;
  v_dollar_price numeric := 1500;
  v_streak_cur integer;
  v_streak_last date;
  v_streak_earnings numeric;
  v_found boolean;
  v_settings jsonb;
  v_exchange jsonb;
  v_plan_settings jsonb;
  v_total_weekly numeric;
  v_a numeric;
  v_d numeric;
  v_day_index integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT p.is_global INTO v_is_global FROM public.profiles p WHERE p.user_id = v_uid;
  v_is_global := COALESCE(v_is_global, false);

  SELECT us.plan_id INTO v_plan_id FROM public.user_subscriptions us WHERE us.user_id = v_uid;
  v_plan_id := COALESCE(v_plan_id, 'free');

  -- Get current streak state
  SELECT dls.current_streak, dls.last_claimed_date, dls.total_streak_earnings
  INTO v_streak_cur, v_streak_last, v_streak_earnings
  FROM public.daily_login_streaks dls WHERE dls.user_id = v_uid;

  v_found := FOUND;

  IF NOT v_found THEN
    v_new_streak := 1;
  ELSIF v_streak_last = v_today THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already claimed today''s login reward!',
      'current_streak', v_streak_cur,
      'reward', 0,
      'already_claimed', true,
      'currency', CASE WHEN v_is_global THEN 'USD' ELSE 'NGN' END
    );
  ELSIF v_streak_last = v_today - 1 THEN
    IF v_streak_cur >= 7 THEN
      v_new_streak := 1;
    ELSE
      v_new_streak := v_streak_cur + 1;
    END IF;
  ELSE
    v_new_streak := 1;
  END IF;

  -- Load exchange rates
  SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';
  IF v_exchange IS NOT NULL AND (v_exchange->>'dollarPrice') IS NOT NULL THEN
    v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
  END IF;

  -- Load streak settings
  SELECT ss.value INTO v_settings FROM public.system_settings ss WHERE ss.key = 'streak_settings';

  IF v_settings IS NOT NULL AND (v_settings->v_plan_id) IS NOT NULL THEN
    v_plan_settings := v_settings->v_plan_id;
  ELSE
    v_plan_settings := COALESCE(v_settings->'free', '{"weeklyTotalNgn":320,"weeklyTotalUsd":1}'::jsonb);
  END IF;

  -- Check if streak is enabled for this plan
  IF v_plan_settings IS NOT NULL AND (v_plan_settings->>'enabled')::boolean IS FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Daily streak is not available for your current plan.',
      'current_streak', COALESCE(v_streak_cur, 0),
      'reward', 0,
      'already_claimed', false,
      'currency', CASE WHEN v_is_global THEN 'USD' ELSE 'NGN' END
    );
  END IF;

  -- Determine Total Weekly amount
  IF v_is_global THEN
    v_currency := 'USD';
    v_total_weekly := COALESCE((v_plan_settings->>'weeklyTotalUsd')::numeric, 1.0);
    v_total_weekly := v_total_weekly * v_dollar_price;
  ELSE
    v_currency := 'NGN';
    v_total_weekly := COALESCE((v_plan_settings->>'weeklyTotalNgn')::numeric, 320.0);
  END IF;

  -- Arithmetic Progression: 7 terms summing to v_total_weekly
  -- S = 7a + 21d = T, with a = 4T/49, d = T/49
  v_a := v_total_weekly * 4.0 / 49.0;
  v_d := v_total_weekly / 49.0;

  v_day_index := v_new_streak;
  IF v_day_index > 7 THEN
    v_day_index := ((v_day_index - 1) % 7) + 1;
  END IF;

  v_reward := ROUND((v_a + (v_day_index - 1) * v_d)::numeric, 2);

  -- Update streak table
  IF NOT v_found THEN
    INSERT INTO public.daily_login_streaks (user_id, current_streak, last_login_date, last_claimed_date, total_streak_earnings)
    VALUES (v_uid, v_new_streak, v_today, v_today, v_reward);
  ELSE
    UPDATE public.daily_login_streaks
    SET current_streak = v_new_streak,
        last_login_date = v_today,
        last_claimed_date = v_today,
        total_streak_earnings = COALESCE(total_streak_earnings, 0) + v_reward,
        updated_at = now()
    WHERE user_id = v_uid;
  END IF;

  -- Update wallet
  UPDATE public.wallet_balances
  SET balance = balance + v_reward,
      total_earnings = total_earnings + v_reward,
      updated_at = now()
  WHERE user_id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
    VALUES (v_uid, v_reward, v_reward);
  END IF;

  -- Log transaction
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
      'is_global', v_is_global
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

GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward TO authenticated;

-- =========================================================
-- PLAN-BASED & NATIONALITY-BASED DAILY STREAK REWARDS
-- =========================================================
-- Rewards are randomized within min-max ranges per plan.
-- NON-NIGERIANS earn USD (stored as NGN equivalent at 1500 rate).
-- NIGERIANS earn NGN directly.
-- =========================================================

-- ─── 1. UPDATED claim_daily_login_reward() ──────────────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _streak record;
  _profile record;
  _today date := CURRENT_DATE;
  _new_streak integer;
  _reward numeric;
  _plan_id text;
  _is_global boolean;
  _min_reward numeric;
  _max_reward numeric;
  _currency text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Get user's profile (is_global flag)
  SELECT is_global INTO _is_global FROM public.profiles WHERE user_id = _uid;
  _is_global := COALESCE(_is_global, false);

  -- Get user's subscription plan
  SELECT plan_id INTO _plan_id FROM public.user_subscriptions WHERE user_id = _uid;
  _plan_id := COALESCE(_plan_id, 'free');

  -- Determine reward range based on plan + nationality
  IF _is_global THEN
    -- NON-NIGERIAN rewards (stored as NGN equivalent: USD * 1500)
    _currency := 'USD';
    CASE _plan_id
      WHEN 'free'      THEN _min_reward := 0.20 * 1500;  _max_reward := 0.50 * 1500;
      WHEN 'starter'   THEN _min_reward := 0.50 * 1500;  _max_reward := 1.00 * 1500;
      WHEN 'pro'       THEN _min_reward := 1.00 * 1500;  _max_reward := 3.00 * 1500;
      WHEN 'elite'     THEN _min_reward := 1.00 * 1500;  _max_reward := 5.00 * 1500;
      WHEN 'vip'       THEN _min_reward := 2.00 * 1500;  _max_reward := 8.00 * 1500;
      WHEN 'executive' THEN _min_reward := 3.00 * 1500;  _max_reward := 15.00 * 1500;
      WHEN 'platinum'  THEN _min_reward := 10.00 * 1500; _max_reward := 30.00 * 1500;
      ELSE                  _min_reward := 0.20 * 1500;  _max_reward := 0.50 * 1500;
    END CASE;
  ELSE
    -- NIGERIAN rewards (in NGN directly)
    _currency := 'NGN';
    CASE _plan_id
      WHEN 'free'      THEN _min_reward := 10;     _max_reward := 500;
      WHEN 'starter'   THEN _min_reward := 100;    _max_reward := 500;
      WHEN 'pro'       THEN _min_reward := 160;    _max_reward := 1000;
      WHEN 'elite'     THEN _min_reward := 200;    _max_reward := 14500;
      WHEN 'vip'       THEN _min_reward := 300;    _max_reward := 22500;
      WHEN 'executive' THEN _min_reward := 500;    _max_reward := 13500;
      WHEN 'platinum'  THEN _min_reward := 1000;   _max_reward := 5000;
      ELSE                  _min_reward := 10;     _max_reward := 500;
    END CASE;
  END IF;

  -- Randomize reward within range (rounded to 2 decimal places)
  _reward := ROUND((_min_reward + random() * (_max_reward - _min_reward))::numeric, 2);

  -- Get current streak record
  SELECT * INTO _streak FROM public.daily_login_streaks WHERE user_id = _uid;

  IF _streak IS NULL THEN
    -- First time ever — Day 1
    _new_streak := 1;

    INSERT INTO public.daily_login_streaks (user_id, current_streak, last_login_date, last_claimed_date, total_streak_earnings)
    VALUES (_uid, _new_streak, _today, _today, _reward);

  ELSIF _streak.last_claimed_date = _today THEN
    -- Already claimed today
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already claimed today''s login reward!',
      'current_streak', _streak.current_streak,
      'reward', 0,
      'already_claimed', true,
      'currency', _currency
    );

  ELSIF _streak.last_claimed_date = _today - 1 THEN
    -- Consecutive day — increment streak
    IF _streak.current_streak >= 7 THEN
      _new_streak := 1;  -- Reset after 7-day cycle completes
    ELSE
      _new_streak := _streak.current_streak + 1;
    END IF;

    UPDATE public.daily_login_streaks
    SET current_streak = _new_streak,
        last_login_date = _today,
        last_claimed_date = _today,
        total_streak_earnings = total_streak_earnings + _reward,
        updated_at = now()
    WHERE user_id = _uid;

  ELSE
    -- Missed a day — reset to Day 1
    _new_streak := 1;

    UPDATE public.daily_login_streaks
    SET current_streak = _new_streak,
        last_login_date = _today,
        last_claimed_date = _today,
        total_streak_earnings = total_streak_earnings + _reward,
        updated_at = now()
    WHERE user_id = _uid;
  END IF;

  -- Credit reward to wallet (balance + total_earnings)
  UPDATE public.wallet_balances
  SET balance = balance + _reward,
      total_earnings = total_earnings + _reward,
      updated_at = now()
  WHERE user_id = _uid;

  -- If no wallet row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
    VALUES (_uid, _reward, _reward);
  END IF;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (
    _uid,
    _reward,
    'login_reward',
    'completed',
    CASE WHEN _is_global
      THEN format('Day %s Streak — $%s USD reward', _new_streak, ROUND(_reward / 1500.0, 2))
      ELSE format('Day %s Streak — ₦%s reward', _new_streak, _reward)
    END,
    jsonb_build_object(
      'streak_day', _new_streak,
      'plan_id', _plan_id,
      'currency', _currency,
      'is_global', _is_global,
      'min_range', _min_reward,
      'max_range', _max_reward
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN _is_global
      THEN format('$%s USD earned for Day %s login streak!', ROUND(_reward / 1500.0, 2), _new_streak)
      ELSE format('₦%s earned for Day %s login streak!', _reward, _new_streak)
    END,
    'current_streak', _new_streak,
    'reward', _reward,
    'already_claimed', false,
    'currency', _currency,
    'plan_id', _plan_id,
    'is_global', _is_global
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;


-- ─── 2. UPDATED get_login_streak_status() ───────────────────────────
-- Now also returns plan_id, is_global, and reward ranges for frontend display
CREATE OR REPLACE FUNCTION public.get_login_streak_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _streak record;
  _today date := CURRENT_DATE;
  _display_streak integer;
  _claimed_today boolean;
  _plan_id text;
  _is_global boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Get user's profile
  SELECT is_global INTO _is_global FROM public.profiles WHERE user_id = _uid;
  _is_global := COALESCE(_is_global, false);

  -- Get user's plan
  SELECT plan_id INTO _plan_id FROM public.user_subscriptions WHERE user_id = _uid;
  _plan_id := COALESCE(_plan_id, 'free');

  SELECT * INTO _streak FROM public.daily_login_streaks WHERE user_id = _uid;

  IF _streak IS NULL THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'claimed_today', false,
      'total_streak_earnings', 0,
      'plan_id', _plan_id,
      'is_global', _is_global
    );
  END IF;

  _claimed_today := (_streak.last_claimed_date = _today);

  IF _claimed_today THEN
    _display_streak := _streak.current_streak;
  ELSIF _streak.last_claimed_date = _today - 1 THEN
    _display_streak := _streak.current_streak;
  ELSE
    _display_streak := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', _display_streak,
    'claimed_today', _claimed_today,
    'total_streak_earnings', _streak.total_streak_earnings,
    'plan_id', _plan_id,
    'is_global', _is_global
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_streak_status() TO authenticated;

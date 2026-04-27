-- 1. ADD FLAGGED STATUS
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'flagged';

-- 2. ADMIN TOGGLE USER FLAG RPC
CREATE OR REPLACE FUNCTION admin_toggle_user_flag(p_user_id uuid, p_is_flagged boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.profiles
  SET status = CASE WHEN p_is_flagged THEN 'flagged'::public.user_status ELSE 'active'::public.user_status END,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_flag TO authenticated;

-- 3. UPDATED claim_daily_login_reward TO USE NIGERIAN ARRAY 7-DAY LOGIC
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
  
  -- Settings
  v_settings jsonb;
  v_exchange jsonb;
  v_plan_settings jsonb;
  v_min_reward numeric;
  v_max_reward numeric;

  -- Arrays for Nigerian daily rewards (7-day pattern)
  v_rewards_starter numeric[] := ARRAY[40, 50, 60, 70, 80, 90, 110];
  v_rewards_pro numeric[] := ARRAY[60, 80, 100, 120, 140, 160, 173];
  v_rewards_elite numeric[] := ARRAY[120, 150, 200, 250, 300, 320, 327];
  v_rewards_vip numeric[] := ARRAY[250, 350, 450, 550, 650, 700, 383];
  v_rewards_executive numeric[] := ARRAY[600, 900, 1200, 1500, 1800, 1900, 1433];
  v_rewards_platinum numeric[] := ARRAY[1200, 1800, 2400, 3000, 3600, 3800, 2867];
  v_rewards_free numeric[] := ARRAY[10, 20, 30, 40, 50, 70, 100];
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

  IF NOT FOUND THEN
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

  -- Determine reward amount
  IF v_is_global THEN
    v_currency := 'USD';
    
    SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';
    IF v_exchange IS NOT NULL AND v_exchange ? 'dollarPrice' THEN
      v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
    END IF;

    SELECT ss.value INTO v_settings FROM public.system_settings ss WHERE ss.key = 'streak_settings';
    IF v_settings IS NOT NULL AND v_settings ? v_plan_id THEN
      v_plan_settings := v_settings->v_plan_id;
      v_min_reward := (v_plan_settings->>'usdMin')::numeric * v_dollar_price;
      v_max_reward := (v_plan_settings->>'usdMax')::numeric * v_dollar_price;
    ELSE
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
    END IF;
    
    v_reward := ROUND((v_min_reward + random() * (v_max_reward - v_min_reward))::numeric, 2);
  ELSE
    v_currency := 'NGN';
    -- Pick specific reward from array based on day of week (v_new_streak)
    CASE v_plan_id
      WHEN 'starter'   THEN v_reward := v_rewards_starter[v_new_streak];
      WHEN 'pro'       THEN v_reward := v_rewards_pro[v_new_streak];
      WHEN 'elite'     THEN v_reward := v_rewards_elite[v_new_streak];
      WHEN 'vip'       THEN v_reward := v_rewards_vip[v_new_streak];
      WHEN 'executive' THEN v_reward := v_rewards_executive[v_new_streak];
      WHEN 'platinum'  THEN v_reward := v_rewards_platinum[v_new_streak];
      ELSE                  v_reward := v_rewards_free[v_new_streak];
    END CASE;
  END IF;

  -- Update streak table
  IF NOT FOUND THEN
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

-- 4. READJUST EXISTING NIGERIAN USERS' BALANCES
DO $$
DECLARE
  v_rec record;
  v_expected_earnings numeric;
  v_diff numeric;
  v_rewards_starter numeric[] := ARRAY[40, 50, 60, 70, 80, 90, 110];
  v_rewards_pro numeric[] := ARRAY[60, 80, 100, 120, 140, 160, 173];
  v_rewards_elite numeric[] := ARRAY[120, 150, 200, 250, 300, 320, 327];
  v_rewards_vip numeric[] := ARRAY[250, 350, 450, 550, 650, 700, 383];
  v_rewards_executive numeric[] := ARRAY[600, 900, 1200, 1500, 1800, 1900, 1433];
  v_rewards_platinum numeric[] := ARRAY[1200, 1800, 2400, 3000, 3600, 3800, 2867];
  v_rewards_free numeric[] := ARRAY[10, 20, 30, 40, 50, 70, 100];
  v_rewards numeric[];
  i integer;
BEGIN
  FOR v_rec IN 
    SELECT dls.user_id, dls.current_streak, dls.total_streak_earnings, COALESCE(us.plan_id, 'free') as plan_id
    FROM public.daily_login_streaks dls
    JOIN public.profiles p ON dls.user_id = p.user_id
    LEFT JOIN public.user_subscriptions us ON dls.user_id = us.user_id
    WHERE p.is_global = false
  LOOP
    -- Determine the correct array
    CASE v_rec.plan_id
      WHEN 'starter' THEN v_rewards := v_rewards_starter;
      WHEN 'pro' THEN v_rewards := v_rewards_pro;
      WHEN 'elite' THEN v_rewards := v_rewards_elite;
      WHEN 'vip' THEN v_rewards := v_rewards_vip;
      WHEN 'executive' THEN v_rewards := v_rewards_executive;
      WHEN 'platinum' THEN v_rewards := v_rewards_platinum;
      ELSE v_rewards := v_rewards_free;
    END CASE;

    -- Calculate expected earnings based on their current streak
    v_expected_earnings := 0;
    FOR i IN 1..LEAST(v_rec.current_streak, 7) LOOP
      v_expected_earnings := v_expected_earnings + v_rewards[i];
    END LOOP;
    
    -- If they had > 7 streaks, add multiples of the full 7-day sum
    IF v_rec.current_streak > 7 THEN
      v_expected_earnings := v_expected_earnings + ((v_rec.current_streak - 7) / 7) * (SELECT sum(val) FROM unnest(v_rewards) val);
      -- Add the remainder
      FOR i IN 1..(v_rec.current_streak % 7) LOOP
         v_expected_earnings := v_expected_earnings + v_rewards[i];
      END LOOP;
    END IF;

    -- Readjust if they earned more
    IF v_rec.total_streak_earnings > v_expected_earnings THEN
      v_diff := v_rec.total_streak_earnings - v_expected_earnings;
      
      -- Update streak earnings
      UPDATE public.daily_login_streaks
      SET total_streak_earnings = v_expected_earnings
      WHERE user_id = v_rec.user_id;

      -- Update wallet
      UPDATE public.wallet_balances
      SET balance = GREATEST(balance - v_diff, 0),
          total_earnings = GREATEST(total_earnings - v_diff, 0)
      WHERE user_id = v_rec.user_id;

      -- Insert a readjustment log
      INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
      VALUES (
        v_rec.user_id,
        -v_diff,
        'penalty',
        'completed',
        'System readjustment of daily streak earnings to new plan scale',
        jsonb_build_object('reason', 'streak_readjustment', 'expected', v_expected_earnings, 'previous', v_rec.total_streak_earnings)
      );
    END IF;
  END LOOP;
END;
$$;

-- STEP 2: EARNING CORRECTION SCRIPT
-- Run this in Supabase SQL Editor AFTER Step 1 succeeds
-- This recalculates all existing streak earnings and corrects overpayments

DO $$
DECLARE
  v_rec record;
  v_settings jsonb;
  v_exchange jsonb;
  v_plan_settings jsonb;
  v_dollar_price numeric := 1500;
  v_total_weekly numeric;
  v_a numeric;
  v_d numeric;
  v_correct_total numeric;
  v_actual_total numeric;
  v_diff numeric;
  v_num_complete_weeks integer;
  v_remaining_days integer;
  v_day_count integer;
  v_i integer;
BEGIN
  -- Load exchange rates
  SELECT ss.value INTO v_exchange FROM public.system_settings ss WHERE ss.key = 'exchange_rates';
  IF v_exchange IS NOT NULL AND (v_exchange->>'dollarPrice') IS NOT NULL THEN
    v_dollar_price := (v_exchange->>'dollarPrice')::numeric;
  END IF;

  -- Load streak settings
  SELECT ss.value INTO v_settings FROM public.system_settings ss WHERE ss.key = 'streak_settings';

  FOR v_rec IN
    SELECT
      dls.user_id,
      dls.total_streak_earnings,
      COALESCE(us.plan_id, 'free') as plan_id,
      p.is_global
    FROM public.daily_login_streaks dls
    JOIN public.profiles p ON dls.user_id = p.user_id
    LEFT JOIN public.user_subscriptions us ON dls.user_id = us.user_id
    WHERE dls.total_streak_earnings > 0
  LOOP
    -- Get this user's actual total from transaction log
    SELECT COALESCE(SUM(amount), 0) INTO v_actual_total
    FROM public.wallet_transactions
    WHERE user_id = v_rec.user_id
      AND type = 'login_reward'
      AND status = 'completed';

    IF v_actual_total <= 0 THEN
      CONTINUE;
    END IF;

    -- Determine the plan-specific weekly total
    IF v_settings IS NOT NULL AND (v_settings->v_rec.plan_id) IS NOT NULL THEN
      v_plan_settings := v_settings->v_rec.plan_id;
    ELSE
      v_plan_settings := COALESCE(v_settings->'free', '{"weeklyTotalNgn":320,"weeklyTotalUsd":1}'::jsonb);
    END IF;

    IF v_rec.is_global THEN
      v_total_weekly := COALESCE((v_plan_settings->>'weeklyTotalUsd')::numeric, 1.0) * v_dollar_price;
    ELSE
      v_total_weekly := COALESCE((v_plan_settings->>'weeklyTotalNgn')::numeric, 320.0);
    END IF;

    -- Count how many login_reward transactions this user has
    SELECT COUNT(*) INTO v_day_count
    FROM public.wallet_transactions
    WHERE user_id = v_rec.user_id
      AND type = 'login_reward'
      AND status = 'completed';

    -- Calculate what they SHOULD have earned
    v_a := v_total_weekly * 4.0 / 49.0;
    v_d := v_total_weekly / 49.0;

    v_num_complete_weeks := v_day_count / 7;
    v_remaining_days := v_day_count % 7;

    -- Full weeks = v_total_weekly each (by AP design)
    v_correct_total := v_num_complete_weeks * v_total_weekly;

    -- Add remaining days
    FOR v_i IN 1..v_remaining_days LOOP
      v_correct_total := v_correct_total + (v_a + (v_i - 1) * v_d);
    END LOOP;

    v_correct_total := ROUND(v_correct_total::numeric, 2);
    v_diff := v_actual_total - v_correct_total;

    -- Only deduct if overpaid by more than 1 unit
    IF v_diff > 1 THEN
      UPDATE public.wallet_balances
      SET balance = GREATEST(balance - v_diff, 0),
          total_earnings = GREATEST(total_earnings - v_diff, 0)
      WHERE user_id = v_rec.user_id;

      UPDATE public.daily_login_streaks
      SET total_streak_earnings = v_correct_total
      WHERE user_id = v_rec.user_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
      VALUES (
        v_rec.user_id,
        -v_diff,
        'system_correction',
        'completed',
        format('Streak earning correction: adjusted -%s to match new weekly plan limits', ROUND(v_diff, 2)),
        jsonb_build_object(
          'reason', 'streak_earning_correction',
          'old_total', v_actual_total,
          'correct_total', v_correct_total,
          'diff', v_diff,
          'plan_id', v_rec.plan_id,
          'is_global', v_rec.is_global
        )
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Earning correction complete!';
END;
$$;

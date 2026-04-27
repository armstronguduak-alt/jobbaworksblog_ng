-- Script to readjust Nigerian users balances
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
    -- Assuming they got the array amounts for day 1 to current_streak
    v_expected_earnings := 0;
    FOR i IN 1..LEAST(v_rec.current_streak, 7) LOOP
      v_expected_earnings := v_expected_earnings + v_rewards[i];
    END LOOP;
    
    -- If they had > 7 streaks, let's just approximate the rest as multiples of the full 7-day sum
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
        'System readjustment of daily streak earnings',
        jsonb_build_object('reason', 'streak_readjustment', 'expected', v_expected_earnings, 'previous', v_rec.total_streak_earnings)
      );
    END IF;
  END LOOP;
END;
$$;

-- STEP 2b: APPLY EARNING CORRECTIONS
-- First add the enum value, then correct overpayments

-- Add system_correction to the transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'system_correction';

-- Now apply corrections (set-based, fast)
WITH exchange AS (
  SELECT COALESCE((value->>'dollarPrice')::numeric, 1500) as dollar_price
  FROM public.system_settings WHERE key = 'exchange_rates'
),
streak_cfg AS (
  SELECT value as settings
  FROM public.system_settings WHERE key = 'streak_settings'
),
user_data AS (
  SELECT
    dls.user_id,
    dls.total_streak_earnings,
    COALESCE(us.plan_id, 'free') as plan_id,
    p.is_global
  FROM public.daily_login_streaks dls
  JOIN public.profiles p ON dls.user_id = p.user_id
  LEFT JOIN public.user_subscriptions us ON dls.user_id = us.user_id
  WHERE dls.total_streak_earnings > 0
),
tx_counts AS (
  SELECT
    user_id,
    COUNT(*) as day_count,
    SUM(amount) as actual_total
  FROM public.wallet_transactions
  WHERE type = 'login_reward' AND status = 'completed'
  GROUP BY user_id
),
corrections AS (
  SELECT
    ud.user_id,
    ud.plan_id,
    ud.is_global,
    tc.actual_total,
    tc.day_count,
    CASE
      WHEN ud.is_global THEN
        COALESCE(
          (sc.settings->(ud.plan_id::text)->>'weeklyTotalUsd')::numeric,
          (sc.settings->'free'->>'weeklyTotalUsd')::numeric,
          1.0
        ) * ex.dollar_price
      ELSE
        COALESCE(
          (sc.settings->(ud.plan_id::text)->>'weeklyTotalNgn')::numeric,
          (sc.settings->'free'->>'weeklyTotalNgn')::numeric,
          320.0
        )
    END as total_weekly
  FROM user_data ud
  JOIN tx_counts tc ON ud.user_id = tc.user_id
  CROSS JOIN exchange ex
  CROSS JOIN streak_cfg sc
  WHERE tc.actual_total > 0
),
final_calc AS (
  SELECT
    c.*,
    ROUND((
      (c.day_count / 7) * c.total_weekly
      + (c.day_count % 7) * (c.total_weekly * 4.0 / 49.0)
      + (c.total_weekly / 49.0) * (c.day_count % 7) * ((c.day_count % 7) - 1) / 2.0
    )::numeric, 2) as correct_total
  FROM corrections c
),
overpaid AS (
  SELECT *,
    ROUND((actual_total - correct_total)::numeric, 2) as diff
  FROM final_calc
  WHERE actual_total - correct_total > 1
),
wallet_update AS (
  UPDATE public.wallet_balances wb
  SET balance = GREATEST(wb.balance - o.diff, 0),
      total_earnings = GREATEST(wb.total_earnings - o.diff, 0)
  FROM overpaid o
  WHERE wb.user_id = o.user_id
  RETURNING wb.user_id
),
streak_update AS (
  UPDATE public.daily_login_streaks dls
  SET total_streak_earnings = o.correct_total
  FROM overpaid o
  WHERE dls.user_id = o.user_id
  RETURNING dls.user_id
),
correction_log AS (
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  SELECT
    o.user_id,
    -o.diff,
    'system_correction',
    'completed',
    'Streak earning correction: adjusted to match new weekly plan limits',
    jsonb_build_object(
      'reason', 'streak_earning_correction',
      'old_total', o.actual_total,
      'correct_total', o.correct_total,
      'diff', o.diff,
      'plan_id', o.plan_id,
      'is_global', o.is_global
    )
  FROM overpaid o
  RETURNING user_id
)
SELECT COUNT(*) as users_corrected FROM correction_log;

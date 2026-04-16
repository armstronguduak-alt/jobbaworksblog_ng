-- =========================================================
-- NATIONALITY-BASED LEADERBOARD FILTER & REFERRAL SETTINGS
-- =========================================================

-- 1. Updated leaderboard RPC with nationality filtering
-- Nigerians see ONLY Nigerians, non-Nigerians see ONLY non-Nigerians
DROP FUNCTION IF EXISTS public.get_leaderboard(integer);
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _limit integer DEFAULT 50,
  _is_global boolean DEFAULT false
)
RETURNS TABLE (
  rank              bigint,
  user_id           uuid,
  name              text,
  username          text,
  avatar_url        text,
  total_earnings    numeric,
  referral_earnings numeric,
  plan_id           text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $func$
  SELECT
    ROW_NUMBER() OVER (ORDER BY wb.total_earnings DESC),
    p.user_id, p.name, p.username, p.avatar_url,
    wb.total_earnings, wb.referral_earnings,
    COALESCE(us.plan_id::text, 'free')
  FROM public.wallet_balances wb
  JOIN  public.profiles          p  ON p.user_id  = wb.user_id
  LEFT JOIN public.user_subscriptions us ON us.user_id = wb.user_id
  WHERE (p.status = 'active' OR p.status IS NULL)
    AND (COALESCE(p.is_global, false) = _is_global)
  ORDER BY wb.total_earnings DESC
  LIMIT _limit;
$func$;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer, boolean) TO anon, authenticated;

-- 2. Insert default referral_settings into system_settings
INSERT INTO public.system_settings (key, value)
VALUES (
  'referral_settings',
  '{
    "nigerianReferralPercent": 25,
    "swapEnabledForNigerians": true,
    "crossReferralRewards": {
      "free": 0,
      "starter": 0.50,
      "pro": 1.50,
      "elite": 3.00,
      "vip": 5.00,
      "executive": 7.00,
      "platinum": 10.00
    }
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 3. Update the non_nigerian_plans default pricing
-- Plan              | Non-Nigerians | Nigerians
-- Free Tier         | $0            | $0
-- Starter           | $10           | $2
-- Pro-Active        | $20           | $5
-- Elite Growth      | $30           | $10
-- VIP Power         | $50           | $20
-- Executive Master  | $100          | $35
-- Platinum Master   | $250          | $50
UPDATE public.system_settings
SET value = '{
  "free":      {"id": "free",      "price": 0},
  "starter":   {"id": "starter",   "price": 10},
  "pro":       {"id": "pro",       "price": 20},
  "elite":     {"id": "elite",     "price": 30},
  "vip":       {"id": "vip",       "price": 50},
  "executive": {"id": "executive", "price": 100},
  "platinum":  {"id": "platinum",  "price": 250}
}'::jsonb
WHERE key = 'non_nigerian_plans';

-- ============================================================
-- DUAL WALLET SYSTEM: Separate Activity & Referral Wallets
-- 
-- Adds referral_balance and referral_usdt_balance columns to 
-- wallet_balances so referral/affiliate earnings are stored 
-- independently from normal activity earnings.
--
-- Going forward:
--   • Activity earnings → balance / usdt_balance
--   • Referral earnings → referral_balance / referral_usdt_balance
-- ============================================================

-- Step 1: Add new columns
ALTER TABLE public.wallet_balances 
  ADD COLUMN IF NOT EXISTS referral_balance numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.wallet_balances 
  ADD COLUMN IF NOT EXISTS referral_usdt_balance numeric(12,2) NOT NULL DEFAULT 0;

-- Step 2: Seed existing referral_balance from historical referral_earnings
-- Since referral earnings were previously mixed into `balance`, we move the 
-- tracked referral_earnings amount into the new referral_balance column.
-- Guard against negative activity balance: only move what's available.
UPDATE public.wallet_balances
SET referral_balance = LEAST(referral_earnings, balance),
    balance = balance - LEAST(referral_earnings, balance)
WHERE referral_earnings > 0;

-- Step 3: Create a dedicated credit function for referral wallet
CREATE OR REPLACE FUNCTION public.credit_referral_wallet(
  _user_id uuid,
  _amount numeric,
  _type public.transaction_type,
  _description text,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_balances (user_id, referral_balance, referral_earnings, total_earnings, pending_rewards)
  VALUES (_user_id, _amount, _amount, _amount, _amount)
  ON CONFLICT (user_id) DO UPDATE
  SET referral_balance = public.wallet_balances.referral_balance + EXCLUDED.referral_balance,
      referral_earnings = public.wallet_balances.referral_earnings + EXCLUDED.referral_earnings,
      total_earnings = public.wallet_balances.total_earnings + EXCLUDED.total_earnings,
      pending_rewards = public.wallet_balances.pending_rewards + EXCLUDED.pending_rewards,
      updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (_user_id, _amount, _type, 'completed', _description, COALESCE(_meta, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_referral_wallet(uuid, numeric, public.transaction_type, text, jsonb) TO authenticated;

-- Step 4: Update referral commission trigger to use referral wallet
CREATE OR REPLACE FUNCTION public.process_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer uuid;
  _price numeric(12,2);
  _commission numeric(12,2);
BEGIN
  IF NEW.plan_id = 'free' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.plan_id = OLD.plan_id THEN
    RETURN NEW;
  END IF;

  SELECT r.referrer_user_id INTO _referrer
  FROM public.referrals r
  WHERE r.referred_user_id = NEW.user_id;

  IF _referrer IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT price INTO _price
  FROM public.subscription_plans
  WHERE id = NEW.plan_id;

  _commission := ROUND(_price * 0.25, 2);

  INSERT INTO public.referral_commissions(
    referrer_user_id,
    referred_user_id,
    plan_id,
    plan_price,
    commission_rate,
    commission_amount
  )
  VALUES (_referrer, NEW.user_id, NEW.plan_id, _price, 0.25, _commission)
  ON CONFLICT (referrer_user_id, referred_user_id, plan_id) DO NOTHING;

  IF FOUND THEN
    -- Credit to the REFERRAL wallet instead of the activity wallet
    PERFORM public.credit_referral_wallet(
      _referrer,
      _commission,
      'referral_bonus',
      'Referral plan upgrade bonus (25%)',
      jsonb_build_object('referred_user_id', NEW.user_id, 'plan_id', NEW.plan_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Step 5: Create a swap function that supports source wallet selection
CREATE OR REPLACE FUNCTION public.execute_swap(
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rate numeric;
  _fee_pct numeric;
  _fee numeric;
  _usd numeric;
  _current_balance numeric;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Get rate and fee from system_settings
  SELECT 
    COALESCE((value->>'dollarPrice')::numeric, 1500) ,
    COALESCE((value->>'swapFee')::numeric, 5)
  INTO _rate, _fee_pct
  FROM public.system_settings
  WHERE key = 'exchange_rates';

  IF _rate IS NULL THEN _rate := 1500; END IF;
  IF _fee_pct IS NULL THEN _fee_pct := 5; END IF;

  _fee := _amount * (_fee_pct / 100);
  _usd := (_amount - _fee) / _rate;

  SELECT balance INTO _current_balance
  FROM public.wallet_balances WHERE user_id = _uid;

  IF _current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;

  IF _current_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  UPDATE public.wallet_balances
  SET balance = balance - _amount,
      usdt_balance = COALESCE(usdt_balance, 0) + _usd,
      updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description, meta)
  VALUES (
    _uid, 'swap', _amount, 'completed', 'Swapped NGN for USD',
    jsonb_build_object('rate', _rate, 'ngn_amount', _amount, 'usd_amount', _usd, 'fee', _fee, 'source', 'activity')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Swap completed successfully');
END;
$$;

-- New: Swap specifically from referral wallet
CREATE OR REPLACE FUNCTION public.execute_referral_swap(
  _amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rate numeric;
  _fee_pct numeric;
  _fee numeric;
  _usd numeric;
  _current_balance numeric;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
  END IF;

  SELECT 
    COALESCE((value->>'dollarPrice')::numeric, 1500),
    COALESCE((value->>'swapFee')::numeric, 5)
  INTO _rate, _fee_pct
  FROM public.system_settings
  WHERE key = 'exchange_rates';

  IF _rate IS NULL THEN _rate := 1500; END IF;
  IF _fee_pct IS NULL THEN _fee_pct := 5; END IF;

  _fee := _amount * (_fee_pct / 100);
  _usd := (_amount - _fee) / _rate;

  SELECT referral_balance INTO _current_balance
  FROM public.wallet_balances WHERE user_id = _uid;

  IF _current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;

  IF _current_balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient referral balance');
  END IF;

  UPDATE public.wallet_balances
  SET referral_balance = referral_balance - _amount,
      referral_usdt_balance = COALESCE(referral_usdt_balance, 0) + _usd,
      updated_at = now()
  WHERE user_id = _uid;

  INSERT INTO public.wallet_transactions (user_id, type, amount, status, description, meta)
  VALUES (
    _uid, 'swap', _amount, 'completed', 'Swapped Referral NGN for USD',
    jsonb_build_object('rate', _rate, 'ngn_amount', _amount, 'usd_amount', _usd, 'fee', _fee, 'source', 'referral')
  );

  RETURN jsonb_build_object('success', true, 'message', 'Referral swap completed successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_referral_swap(numeric) TO authenticated;

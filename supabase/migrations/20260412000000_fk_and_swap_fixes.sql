-- Fix foreign keys for referrals so PostgREST can fetch profiles correctly
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_user_id_fkey;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_user_id_fkey;

ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Ensure execute_swap is correctly cached and simple
CREATE OR REPLACE FUNCTION public.execute_swap(
  _amount   numeric,
  _rate     numeric DEFAULT 1600,
  _fee_pct  numeric DEFAULT 0.005
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance numeric;
  _fee numeric;
  _actual_usd numeric;
  _tx_id uuid;
  _settings jsonb;
BEGIN
  -- Maintenance check
  SELECT value INTO _settings FROM public.system_settings WHERE key = 'page_toggles';
  IF _settings IS NOT NULL AND (_settings->>'swapEnabled')::boolean = false THEN
    RETURN jsonb_build_object('success', false, 'message', 'Swap feature is temporarily disabled for maintenance.');
  END IF;

  IF _amount < 1000 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Minimum swap is 1000.');
  END IF;

  SELECT balance INTO _balance FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  
  IF _balance IS NULL OR _balance < _amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  _fee := _amount * _fee_pct;
  _actual_usd := (_amount - _fee) / _rate;

  -- Deduct source NGN balance
  UPDATE public.wallet_balances SET balance = balance - _amount, updated_at = now() WHERE user_id = _uid;

  -- Credit destination USD balance (or any other representation)
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (_uid, -_amount, 'swap', 'completed', 'Swapped NGN for USD', jsonb_build_object('fee', _fee, 'rate', _rate, 'usd_amount', _actual_usd))
  RETURNING id INTO _tx_id;

  RETURN jsonb_build_object('success', true, 'message', format('Successfully swapped for $%s USD.', round(_actual_usd, 2)), 'txn_id', _tx_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

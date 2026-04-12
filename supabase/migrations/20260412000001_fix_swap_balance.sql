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

  -- Deduct source NGN balance and add to usdt_balance
  UPDATE public.wallet_balances 
  SET balance = balance - _amount, 
      usdt_balance = usdt_balance + _actual_usd,
      updated_at = now() 
  WHERE user_id = _uid;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (_uid, -_amount, 'swap', 'completed', 'Swapped NGN for USD', jsonb_build_object('fee', _fee, 'rate', _rate, 'usd_amount', _actual_usd))
  RETURNING id INTO _tx_id;

  RETURN jsonb_build_object('success', true, 'message', format('Successfully swapped for $%s USD.', round(_actual_usd, 2)), 'txn_id', _tx_id);
END;
$$;

NOTIFY pgrst, 'reload schema';

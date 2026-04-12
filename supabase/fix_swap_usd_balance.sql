-- ============================================================
-- FIX: USD balance not updating after swap
-- The swap RPC likely only inserts a wallet_transaction but 
-- does not increment usdt_balance in wallet_balances.
-- This script:
-- 1. Ensures 'swap' exists in transaction_type enum
-- 2. Creates/replaces the execute_swap function to properly 
--    deduct NGN balance AND credit usdt_balance
-- 3. Retroactively fixes existing swap transactions
-- ============================================================

-- Step 0: Ensure 'swap' is in the transaction_type enum
DO $$
BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'swap';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 1: Update all existing swap transactions into usdt_balance
-- Find completed swaps and calculate total USD per user
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT user_id, SUM((meta->>'usd_amount')::numeric) as total_usd
    FROM wallet_transactions
    WHERE type = 'swap' AND status = 'completed'
      AND meta->>'usd_amount' IS NOT NULL
    GROUP BY user_id
  ) LOOP
    UPDATE wallet_balances 
    SET usdt_balance = COALESCE(r.total_usd, 0),
        updated_at = NOW()
    WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- Step 2: Create or replace the execute_swap RPC so future swaps 
-- properly update usdt_balance
CREATE OR REPLACE FUNCTION execute_swap(
  _user_id UUID,
  _ngn_amount NUMERIC,
  _usd_amount NUMERIC,
  _rate NUMERIC
) RETURNS JSONB AS $$
DECLARE
  current_balance NUMERIC;
BEGIN
  -- Get current NGN balance
  SELECT balance INTO current_balance 
  FROM wallet_balances 
  WHERE user_id = _user_id;

  IF current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
  END IF;

  IF current_balance < _ngn_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- Deduct NGN, add USD
  UPDATE wallet_balances 
  SET balance = balance - _ngn_amount,
      usdt_balance = COALESCE(usdt_balance, 0) + _usd_amount,
      updated_at = NOW()
  WHERE user_id = _user_id;

  -- Record the transaction
  INSERT INTO wallet_transactions (user_id, type, amount, status, description, meta)
  VALUES (
    _user_id,
    'swap',
    _ngn_amount,
    'completed',
    'Swapped NGN for USD',
    jsonb_build_object(
      'rate', _rate,
      'ngn_amount', _ngn_amount,
      'usd_amount', _usd_amount
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Swap completed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

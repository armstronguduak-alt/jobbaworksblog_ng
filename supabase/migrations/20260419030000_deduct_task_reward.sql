CREATE OR REPLACE FUNCTION public.deduct_task_reward(p_user_id UUID, p_amount NUMERIC, p_task_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Deduct from balances
  UPDATE public.wallet_balances 
  SET balance = balance - p_amount,
      task_earnings = task_earnings - p_amount
  WHERE user_id = p_user_id;
  
  -- Add a negative transaction record indicating the direct payout
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (p_user_id, -p_amount, 'task_reward', 'completed', 'Task Bounty Direct Payout', jsonb_build_object('task_id', p_task_id, 'manual_deduction', true));
  
  RETURN json_build_object('success', true);
END;
$$;

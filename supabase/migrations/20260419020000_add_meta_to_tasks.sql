-- Add meta column to tasks table to support extra settings like max_participants, start_date, end_date, priority, etc.
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

-- Add task_earnings to wallet_balances
ALTER TABLE public.wallet_balances ADD COLUMN IF NOT EXISTS task_earnings numeric(12,2) NOT NULL DEFAULT 0;

-- Update claim_task_reward to credit task_earnings
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_task_id UUID)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
  v_reward NUMERIC;
  v_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'Not authenticated'); END IF;
  
  v_reward := (SELECT reward_amount FROM public.tasks WHERE id = p_task_id AND status = 'active');
  IF v_reward IS NULL THEN RETURN json_build_object('success', false, 'message', 'Task not found or inactive'); END IF;
  
  v_claimed := (SELECT reward_claimed FROM public.user_tasks WHERE user_id = v_user_id AND task_id = p_task_id);
  IF v_claimed THEN RETURN json_build_object('success', false, 'message', 'Reward already claimed'); END IF;
  
  INSERT INTO public.user_tasks (user_id, task_id, progress, completed, reward_claimed)
  VALUES (v_user_id, p_task_id, 1, true, true)
  ON CONFLICT (user_id, task_id) DO UPDATE SET completed = true, reward_claimed = true, updated_at = NOW();
  
  UPDATE public.wallet_balances 
  SET total_earnings = total_earnings + v_reward, 
      balance = balance + v_reward,
      task_earnings = task_earnings + v_reward
  WHERE user_id = v_user_id;
  
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (v_user_id, v_reward, 'task_reward', 'completed', 'Completed Task Reward');
  
  RETURN json_build_object('success', true, 'message', 'Task reward claimed successfully');
END;
$$;

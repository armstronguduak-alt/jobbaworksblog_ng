CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    reward_amount NUMERIC DEFAULT 0,
    target_count INTEGER DEFAULT 1,
    task_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    reward_claimed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, task_id)
);

-- Insert dummy data
INSERT INTO public.tasks (title, description, reward_amount, target_count, task_type) 
VALUES 
('Refer 5 friends today', 'Invite 5 new users using your referral link today and get a massive bonus.', 5000, 5, 'referrals'),
('Read 10 Articles', 'Complete reading 10 premium articles today.', 500, 10, 'reads');

-- Function to handle claiming
CREATE OR REPLACE FUNCTION public.claim_task_reward(p_task_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_reward NUMERIC;
  v_claimed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Get task info
  SELECT reward_amount INTO v_reward FROM public.tasks WHERE id = p_task_id AND status = 'active';
  IF v_reward IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Task not found or inactive');
  END IF;

  -- Check if already claimed
  SELECT reward_claimed INTO v_claimed FROM public.user_tasks WHERE user_id = v_user_id AND task_id = p_task_id;
  
  IF v_claimed THEN
    RETURN json_build_object('success', false, 'message', 'Reward already claimed');
  END IF;

  -- Mark as claimed
  INSERT INTO public.user_tasks (user_id, task_id, progress, completed, reward_claimed)
  VALUES (v_user_id, p_task_id, 1, true, true)
  ON CONFLICT (user_id, task_id) DO UPDATE SET completed = true, reward_claimed = true, updated_at = NOW();

  -- Credit wallet
  UPDATE public.wallet_balances
  SET total_earnings = total_earnings + v_reward,
      balance = balance + v_reward
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (v_user_id, v_reward, 'task_reward', 'completed', 'Completed Task Reward');

  RETURN json_build_object('success', true, 'message', 'Task reward claimed successfully');
END;
$$;

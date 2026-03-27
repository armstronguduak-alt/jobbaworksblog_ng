UPDATE public.subscription_plans 
SET daily_read_limit = 5, read_reward = 10, daily_comment_limit = 4, comment_reward = 10, monthly_return_cap = 2700, break_even_day = 30, min_referrals = 10
WHERE id = 'free';

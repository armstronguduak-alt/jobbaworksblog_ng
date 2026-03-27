-- Update the subscription_plans backend table with new rules

UPDATE public.subscription_plans 
SET daily_read_limit = 5, read_reward = 0, daily_comment_limit = 2, comment_reward = 0, monthly_return_cap = 0, break_even_day = 30, min_referrals = 10
WHERE id = 'free';

UPDATE public.subscription_plans 
SET daily_read_limit = 6, read_reward = 6, daily_comment_limit = 6, comment_reward = 4, monthly_return_cap = 1500, break_even_day = 18, min_referrals = 10
WHERE id = 'starter';

UPDATE public.subscription_plans 
SET daily_read_limit = 8, read_reward = 12, daily_comment_limit = 8, comment_reward = 7, monthly_return_cap = 4428, break_even_day = 17, min_referrals = 8
WHERE id = 'pro';

UPDATE public.subscription_plans 
SET daily_read_limit = 10, read_reward = 22, daily_comment_limit = 10, comment_reward = 12, monthly_return_cap = 9680, break_even_day = 16, min_referrals = 8
WHERE id = 'elite';

UPDATE public.subscription_plans 
SET daily_read_limit = 12, read_reward = 40, daily_comment_limit = 12, comment_reward = 23, monthly_return_cap = 25376, break_even_day = 15, min_referrals = 8
WHERE id = 'vip';

UPDATE public.subscription_plans 
SET daily_read_limit = 15, read_reward = 70, daily_comment_limit = 20, comment_reward = 50, monthly_return_cap = 57150, break_even_day = 14, min_referrals = 6
WHERE id = 'executive';

UPDATE public.subscription_plans 
SET daily_read_limit = 18, read_reward = 120, daily_comment_limit = 25, comment_reward = 100, monthly_return_cap = 140000, break_even_day = 14, min_referrals = 6
WHERE id = 'platinum';

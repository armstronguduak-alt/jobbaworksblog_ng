-- Add unique constraint on payout methods to allow upsert and add payout_pin to profiles
ALTER TABLE public.payout_methods DROP CONSTRAINT IF EXISTS payout_methods_userid_method_key;
ALTER TABLE public.payout_methods ADD CONSTRAINT payout_methods_userid_method_key UNIQUE (user_id, method);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payout_pin text;

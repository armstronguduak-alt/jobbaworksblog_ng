-- Add dark_mode to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false;

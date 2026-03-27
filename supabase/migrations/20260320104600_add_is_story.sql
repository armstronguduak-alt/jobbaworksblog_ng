-- Add is_story column to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS is_story BOOLEAN DEFAULT false;

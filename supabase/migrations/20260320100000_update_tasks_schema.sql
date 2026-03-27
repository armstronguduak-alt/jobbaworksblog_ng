-- Add new columns to the tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS required_plan TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS affiliate_url TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

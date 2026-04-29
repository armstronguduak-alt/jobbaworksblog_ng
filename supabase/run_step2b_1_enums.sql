-- STEP 2b-1: ADD MISSING ENUM VALUES
-- Run this FIRST, alone. Then run step 2b-2.

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'system_correction';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'task_reward';
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'rejected';

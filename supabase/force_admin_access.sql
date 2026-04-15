-- =========================================================
-- FORCE ADMIN ACCESS
-- This script finds ALL users who already have an 'admin' 
-- role in user_roles, and ensures they have full permissions.
-- It also lists them so you can verify.
-- =========================================================

-- STEP 1: Ensure columns exist. 
-- RUN THIS BLOCK BY ITSELF FIRST (Highlight and Run)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='permissions') THEN
        ALTER TABLE public.user_roles ADD COLUMN permissions jsonb DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_roles' AND column_name='updated_at') THEN
        ALTER TABLE public.user_roles ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- STEP 2: Update admin permissions
-- RUN THIS AFTER STEP 1 IS COMPLETED
UPDATE public.user_roles 
SET permissions = '["all", "content", "admin", "transactions", "tasks", "promotions", "referrals", "notifications"]'::jsonb,
    updated_at = now()
WHERE role = 'admin';

-- STEP 3: Ensure moderators have basic permissions
UPDATE public.user_roles
SET permissions = CASE 
    WHEN permissions IS NULL OR permissions = '[]'::jsonb OR permissions = 'null'::jsonb
    THEN '["content"]'::jsonb 
    ELSE permissions 
  END,
  updated_at = now()
WHERE role = 'moderator';

-- STEP 4: Show verify results
SELECT 
  ur.user_id,
  ur.role,
  ur.permissions,
  au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role IN ('admin', 'moderator')
ORDER BY ur.role, au.email;

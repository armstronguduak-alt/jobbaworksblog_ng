-- =========================================================
-- FORCE ADMIN ACCESS
-- This script finds ALL users who already have an 'admin' 
-- role in user_roles, and ensures they have full permissions.
-- It also lists them so you can verify.
-- =========================================================

-- 1. Ensure existing admins have ALL permissions
UPDATE public.user_roles 
SET permissions = '["all", "content", "admin", "transactions", "tasks", "promotions", "referrals", "notifications"]'::jsonb,
    updated_at = now()
WHERE role = 'admin';

-- 2. Ensure existing moderators have at least basic permissions if empty
UPDATE public.user_roles
SET permissions = CASE 
    WHEN permissions IS NULL OR permissions = '[]'::jsonb OR permissions = 'null'::jsonb
    THEN '["content"]'::jsonb 
    ELSE permissions 
  END,
  updated_at = now()
WHERE role = 'moderator';

-- 3. Show all admin/moderator users for verification
SELECT 
  ur.user_id,
  ur.role,
  ur.permissions,
  au.email
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.role IN ('admin', 'moderator')
ORDER BY ur.role, au.email;

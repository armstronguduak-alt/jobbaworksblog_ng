-- =========================================================
-- FORCE ADMIN ACCESS FOR A SPECIFIC USER
-- Run this in Supabase SQL Editor if you get locked out of your admin account!
-- =========================================================

DO $$
DECLARE
    -- 👇👇 CHANGE THIS TO YOUR ACTUAL EMAIL ADDRESS 👇👇
    _target_email text := 'admin@jobbaworks.com'; 
    
    _user_id uuid;
BEGIN
    -- 1. Find the user ID by their email
    SELECT id INTO _user_id FROM auth.users WHERE email = _target_email;
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Could not find a user with the email %', _target_email;
    END IF;

    -- 2. Grant them 'admin' role and all permissions
    INSERT INTO public.user_roles (user_id, role, permissions)
    VALUES (
        _user_id, 
        'admin', 
        '["all", "content", "admin", "transactions", "tasks", "promotions", "referrals", "notifications"]'::jsonb
    )
    ON CONFLICT (user_id) DO UPDATE 
    SET role = 'admin',
        permissions = '["all", "content", "admin", "transactions", "tasks", "promotions", "referrals", "notifications"]'::jsonb,
        updated_at = now();

    RAISE NOTICE 'Successfully granted super-admin access to %', _target_email;
END $$;

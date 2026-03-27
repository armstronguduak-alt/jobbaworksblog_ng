-- 1) Harden daily counters against user tampering
DROP POLICY IF EXISTS "daily_counters_update_own_or_admin" ON public.daily_user_counters;

CREATE POLICY "daily_counters_update_admin_only"
ON public.daily_user_counters
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Restrict public visibility of system settings to explicitly public rows
ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

UPDATE public.system_settings
SET is_public = true
WHERE key = 'page_toggles';

DROP POLICY IF EXISTS "system_settings_public_read" ON public.system_settings;

CREATE POLICY "system_settings_public_read"
ON public.system_settings
FOR SELECT
TO public
USING (is_public = true);

-- 3) Prevent fabricated referral relationships
DROP POLICY IF EXISTS "referrals_insert_referred_or_admin" ON public.referrals;

CREATE POLICY "referrals_insert_referred_validated"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    auth.uid() = referred_user_id
    AND referrer_user_id <> referred_user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = referrer_user_id
        AND p.referral_code = referral_code_used
    )
  )
);
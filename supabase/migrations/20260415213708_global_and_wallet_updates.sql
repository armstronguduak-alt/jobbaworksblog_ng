-- Global users and wallet updates migration

-- Add country and global flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country text DEFAULT 'Nigeria',
ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+234',
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT false;

-- Add setting for non-nigerian plans
INSERT INTO public.system_settings (key, value)
VALUES (
  'non_nigerian_plans',
  '{
    "free": {"id": "free", "price": 0},
    "starter": {"id": "starter", "price": 5},
    "pro": {"id": "pro", "price": 10},
    "elite": {"id": "elite", "price": 20},
    "vip": {"id": "vip", "price": 40},
    "executive": {"id": "executive", "price": 80},
    "platinum": {"id": "platinum", "price": 150}
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Add settings for USDT addresses
INSERT INTO public.system_settings (key, value)
VALUES (
  'usdt_addresses',
  '["TRxxxxxxxxx1", "TRxxxxxxxxx2", "TRxxxxxxxxx3", "TRxxxxxxxxx4", "TRxxxxxxxxx5"]'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Policies for wallet_transactions so admins AND moderators can view ALL
DROP POLICY IF EXISTS "wallet_tx_select_own_or_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_select_own_or_admin"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- Policy to allow updates by admin AND moderator
DROP POLICY IF EXISTS "wallet_tx_update_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_update_admin"
ON public.wallet_transactions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- ============================================================
-- PROMOTION SHARE TASKS SYSTEM
-- Tracks daily WhatsApp promotion shares + rewards
-- ============================================================

-- 1. Table to track daily promotion share completions
CREATE TABLE IF NOT EXISTS promotion_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_amount NUMERIC(12,2) NOT NULL DEFAULT 300,
  reward_credited BOOLEAN NOT NULL DEFAULT false,
  share_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Prevent duplicate claims per day per user
  CONSTRAINT unique_daily_share UNIQUE (user_id, share_date)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_promotion_shares_user_date ON promotion_shares(user_id, share_date);
CREATE INDEX IF NOT EXISTS idx_promotion_shares_promotion ON promotion_shares(promotion_id);

-- 2. Add share_task fields to promotions table
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS is_share_task BOOLEAN DEFAULT false;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS share_reward_amount NUMERIC(12,2) DEFAULT 300;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS share_caption TEXT;

-- 3. RLS Policies for promotion_shares
ALTER TABLE promotion_shares ENABLE ROW LEVEL SECURITY;

-- Users can view their own shares
DROP POLICY IF EXISTS "promotion_shares_select_own" ON promotion_shares;
CREATE POLICY "promotion_shares_select_own"
ON promotion_shares FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own shares (handled by RPC, but needed for direct queries)
DROP POLICY IF EXISTS "promotion_shares_insert_own" ON promotion_shares;
CREATE POLICY "promotion_shares_insert_own"
ON promotion_shares FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admin can view all
DROP POLICY IF EXISTS "promotion_shares_admin_all" ON promotion_shares;
CREATE POLICY "promotion_shares_admin_all"
ON promotion_shares FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. Add share_reward to transaction_type enum if not present
DO $$ BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'share_reward';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_object  THEN NULL; END $$;

-- 5. RPC to claim a daily promotion share reward
CREATE OR REPLACE FUNCTION public.claim_promotion_share(p_promotion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_already_shared BOOLEAN;
  v_promo RECORD;
  v_reward NUMERIC(12,2);
  v_is_nigerian BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
  END IF;

  -- Check if promotion exists and is active share task
  SELECT * INTO v_promo FROM promotions 
  WHERE id = p_promotion_id AND is_active = true AND is_share_task = true;
  
  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'This promotion is no longer available.');
  END IF;

  -- Check if already shared today
  SELECT EXISTS(
    SELECT 1 FROM promotion_shares 
    WHERE user_id = v_user_id AND share_date = v_today
  ) INTO v_already_shared;

  IF v_already_shared THEN
    RETURN jsonb_build_object('success', false, 'message', 'You have already completed the daily share task today. Come back tomorrow!');
  END IF;

  v_reward := COALESCE(v_promo.share_reward_amount, 300);

  -- Determine user region
  SELECT COALESCE(country = 'Nigeria', true) INTO v_is_nigerian
  FROM profiles WHERE user_id = v_user_id;

  -- Insert share record
  INSERT INTO promotion_shares (user_id, promotion_id, reward_amount, share_date, reward_credited)
  VALUES (v_user_id, p_promotion_id, v_reward, v_today, true);

  -- Credit reward to activity wallet
  IF v_is_nigerian THEN
    UPDATE wallet_balances 
    SET balance = balance + v_reward,
        total_earnings = total_earnings + v_reward
    WHERE user_id = v_user_id;
  ELSE
    -- Convert to approximate USD (use a system rate or flat value)
    UPDATE wallet_balances 
    SET usdt_balance = usdt_balance + (v_reward / 1500),
        total_earnings = total_earnings + v_reward
    WHERE user_id = v_user_id;
  END IF;

  -- Log transaction
  INSERT INTO wallet_transactions (user_id, type, amount, status, description, meta)
  VALUES (
    v_user_id,
    'share_reward',
    v_reward,
    'completed',
    'Daily promotion share reward',
    jsonb_build_object(
      'promotion_id', p_promotion_id,
      'promotion_title', v_promo.title,
      'share_date', v_today::TEXT
    )
  );

  RETURN jsonb_build_object('success', true, 'message', 'Share reward claimed! ₦' || v_reward::TEXT || ' credited.', 'reward', v_reward);
END;
$$;

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.claim_promotion_share(UUID) TO authenticated;

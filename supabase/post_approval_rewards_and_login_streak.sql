-- =========================================================
-- MIGRATION: Post Approval Rewards (₦500) + Daily Login Streak
-- Run this SQL in Supabase SQL Editor
-- =========================================================

-- ─── 1. ADD 'login_reward' TO transaction_type ENUM (safe) ──────────
DO $$
BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'login_reward';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 2. DAILY LOGIN STREAKS TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_login_streaks (
  user_id              UUID PRIMARY KEY,
  current_streak       INTEGER NOT NULL DEFAULT 0,
  last_login_date      DATE,
  last_claimed_date    DATE,
  total_streak_earnings NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_login_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_streaks_select_own" ON public.daily_login_streaks;
CREATE POLICY "login_streaks_select_own"
ON public.daily_login_streaks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "login_streaks_insert_own" ON public.daily_login_streaks;
CREATE POLICY "login_streaks_insert_own"
ON public.daily_login_streaks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "login_streaks_update_own" ON public.daily_login_streaks;
CREATE POLICY "login_streaks_update_own"
ON public.daily_login_streaks FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── 3. CLAIM DAILY LOGIN REWARD FUNCTION ──────────────────────────
CREATE OR REPLACE FUNCTION public.claim_daily_login_reward()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _streak record;
  _today date := CURRENT_DATE;
  _new_streak integer;
  _reward numeric;
  _rewards numeric[] := ARRAY[100, 150, 200, 300, 400, 600, 1000];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  -- Get current streak record
  SELECT * INTO _streak FROM public.daily_login_streaks WHERE user_id = _uid;

  IF _streak IS NULL THEN
    -- First time ever — Day 1
    _new_streak := 1;
    _reward := _rewards[1];

    INSERT INTO public.daily_login_streaks (user_id, current_streak, last_login_date, last_claimed_date, total_streak_earnings)
    VALUES (_uid, _new_streak, _today, _today, _reward);

  ELSIF _streak.last_claimed_date = _today THEN
    -- Already claimed today
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You already claimed today''s login reward!',
      'current_streak', _streak.current_streak,
      'reward', 0,
      'already_claimed', true
    );

  ELSIF _streak.last_claimed_date = _today - 1 THEN
    -- Consecutive day — increment streak
    IF _streak.current_streak >= 7 THEN
      _new_streak := 1;  -- Reset after 7-day cycle completes
    ELSE
      _new_streak := _streak.current_streak + 1;
    END IF;
    _reward := _rewards[_new_streak];

    UPDATE public.daily_login_streaks
    SET current_streak = _new_streak,
        last_login_date = _today,
        last_claimed_date = _today,
        total_streak_earnings = total_streak_earnings + _reward,
        updated_at = now()
    WHERE user_id = _uid;

  ELSE
    -- Missed a day — reset to Day 1
    _new_streak := 1;
    _reward := _rewards[1];

    UPDATE public.daily_login_streaks
    SET current_streak = _new_streak,
        last_login_date = _today,
        last_claimed_date = _today,
        total_streak_earnings = total_streak_earnings + _reward,
        updated_at = now()
    WHERE user_id = _uid;
  END IF;

  -- Credit reward to wallet (balance + total_earnings)
  UPDATE public.wallet_balances
  SET balance = balance + _reward,
      total_earnings = total_earnings + _reward,
      updated_at = now()
  WHERE user_id = _uid;

  -- If no wallet row exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
    VALUES (_uid, _reward, _reward);
  END IF;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (
    _uid,
    _reward,
    'login_reward',
    'completed',
    format('Day %s Login Streak Reward', _new_streak),
    jsonb_build_object('streak_day', _new_streak)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', format('₦%s earned for Day %s login streak!', _reward, _new_streak),
    'current_streak', _new_streak,
    'reward', _reward,
    'already_claimed', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_daily_login_reward() TO authenticated;

-- ─── 4. POST APPROVAL REWARD TRIGGER (₦500 per first-time approval) ──
-- Tracks whether an article was already rewarded via wallet_transactions meta

CREATE OR REPLACE FUNCTION public.credit_post_approval_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author_id uuid;
  _already_rewarded boolean;
  _reward numeric := 500;
BEGIN
  -- Only fire when status changes TO 'approved'
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF OLD.status = 'approved' THEN RETURN NEW; END IF;

  _author_id := NEW.author_user_id;

  -- Check if reward was already given for this post (prevents double-pay on re-approval)
  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = _author_id
      AND type = 'post_approval_reward'
      AND meta->>'post_id' = NEW.id::text
      AND status = 'completed'
  ) INTO _already_rewarded;

  IF _already_rewarded THEN RETURN NEW; END IF;

  -- Credit ₦500 to the author's wallet
  UPDATE public.wallet_balances
  SET balance = balance + _reward,
      total_earnings = total_earnings + _reward,
      post_earnings = post_earnings + _reward,
      updated_at = now()
  WHERE user_id = _author_id;

  -- If no wallet row, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings, post_earnings)
    VALUES (_author_id, _reward, _reward, _reward);
  END IF;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (
    _author_id,
    _reward,
    'post_approval_reward',
    'completed',
    format('Article "%s" approved — ₦500 Author Reward', LEFT(NEW.title, 60)),
    jsonb_build_object('post_id', NEW.id, 'article_title', NEW.title)
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_post_approval_reward ON public.posts;
CREATE TRIGGER trg_post_approval_reward
AFTER UPDATE OF status ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.credit_post_approval_reward();

-- ─── 5. GET LOGIN STREAK STATUS (for the modal, no side effects) ────
CREATE OR REPLACE FUNCTION public.get_login_streak_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _streak record;
  _today date := CURRENT_DATE;
  _display_streak integer;
  _claimed_today boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT * INTO _streak FROM public.daily_login_streaks WHERE user_id = _uid;

  IF _streak IS NULL THEN
    -- Never logged in before
    RETURN jsonb_build_object(
      'current_streak', 0,
      'claimed_today', false,
      'total_streak_earnings', 0
    );
  END IF;

  _claimed_today := (_streak.last_claimed_date = _today);

  -- If claimed today, show current streak
  -- If last claim was yesterday, show current streak (will increment on claim)
  -- If last claim was older, streak will reset to 1 on claim
  IF _claimed_today THEN
    _display_streak := _streak.current_streak;
  ELSIF _streak.last_claimed_date = _today - 1 THEN
    _display_streak := _streak.current_streak;
  ELSE
    _display_streak := 0; -- Will reset to 1
  END IF;

  RETURN jsonb_build_object(
    'current_streak', _display_streak,
    'claimed_today', _claimed_today,
    'total_streak_earnings', _streak.total_streak_earnings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_streak_status() TO authenticated;

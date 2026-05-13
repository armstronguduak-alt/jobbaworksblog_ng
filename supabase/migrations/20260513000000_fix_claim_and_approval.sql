-- =========================================================
-- FIX: credit_author_earnings + create_article_notifications
-- Resolves:
--   1. Users can't claim article read rewards
--      (credit_author_earnings function missing from DB)
--   2. Admin can't approve articles
--      (create_article_notifications function missing / wrong columns)
-- =========================================================

-- ─── 1. Recreate credit_author_earnings ─────────────────
-- Called inside claim_post_read; credits the post author
-- a bonus when their article hits view milestones.

CREATE OR REPLACE FUNCTION public.credit_author_earnings(_post_id uuid, _reader_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author_id         uuid;
  _monetization_rate numeric;
  _current_views     integer;
  _author_earnings   numeric;
BEGIN
  SELECT author_user_id INTO _author_id FROM public.posts WHERE id = _post_id;
  IF _author_id IS NULL OR _author_id = _reader_id THEN RETURN; END IF;

  SELECT (value->>'rate')::numeric INTO _monetization_rate
  FROM public.system_settings WHERE key = 'monetization_rate';
  IF _monetization_rate IS NULL OR _monetization_rate <= 0 THEN RETURN; END IF;

  SELECT views INTO _current_views FROM public.posts WHERE id = _post_id;

  IF _current_views % 1000 = 0 AND _current_views > 0 THEN
    _author_earnings := _monetization_rate;
    UPDATE public.posts SET earnings = earnings + _author_earnings WHERE id = _post_id;
    PERFORM public.credit_wallet(
      _author_id, _author_earnings, 'post_approval_reward',
      format('Author reward — %s views milestone', _current_views),
      jsonb_build_object('post_id', _post_id, 'milestone_views', _current_views));
    UPDATE public.wallet_balances
    SET post_earnings = post_earnings + _author_earnings, updated_at = now()
    WHERE user_id = _author_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_author_earnings(uuid, uuid) TO authenticated;


-- ─── 2. Recreate create_article_notifications ───────────
-- Called by AdminContent when an article is approved.
-- Uses the actual notifications table schema (no title/related_id columns).

CREATE OR REPLACE FUNCTION public.create_article_notifications(
  p_article_id UUID,
  p_author_id  UUID,
  p_title      TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f_record RECORD;
BEGIN
  -- Notify each follower of the author
  FOR f_record IN
    SELECT follower_id FROM public.followers WHERE following_id = p_author_id
  LOOP
    INSERT INTO public.notifications (user_id, message, type)
    VALUES (
      f_record.follower_id,
      'An author you follow just published: ' || p_title,
      'article_published'
    );
  END LOOP;
EXCEPTION
  -- If the followers table doesn't exist yet, just skip silently
  WHEN undefined_table THEN
    NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_article_notifications(uuid, uuid, text) TO authenticated;


-- ─── 3. Ensure the posts.earnings column exists ─────────
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS earnings numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views    integer       NOT NULL DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reads    integer       NOT NULL DEFAULT 0;

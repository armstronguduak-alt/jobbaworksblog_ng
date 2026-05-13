-- =========================================================
-- FIX: validate_post_submission blocking admin approval
-- The trigger fires on status UPDATE and checks word_count,
-- but admins should be able to approve posts regardless.
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_post_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow admins/moderators to approve or reject regardless of word count
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('approved', 'rejected') THEN
      -- Admin moderation action — skip word count check
      RETURN NEW;
    END IF;
  END IF;

  -- For user submissions: enforce minimum word count
  IF NEW.status IN ('pending','approved') AND NEW.word_count < 800 THEN
    RAISE EXCEPTION 'Post must contain at least 800 words before submission/approval.';
  END IF;
  RETURN NEW;
END;
$$;

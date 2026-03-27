CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_post_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  wc integer;
BEGIN
  wc := COALESCE(array_length(regexp_split_to_array(trim(regexp_replace(NEW.content, '<[^>]+>', ' ', 'g')), '\s+'), 1), 0);
  NEW.word_count := wc;
  NEW.reading_time_seconds := GREATEST(60, CEIL((wc::numeric / 200) * 60)::int);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_post_submission()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('pending','approved') AND NEW.word_count < 800 THEN
    RAISE EXCEPTION 'Post must contain at least 800 words before submission/approval.';
  END IF;
  RETURN NEW;
END;
$$;
-- =========================================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Story Chapter Rewards (₦200 per chapter approval) 
-- + Retroactive Rewards for already published chapters
-- =========================================================

-- 1. Create the Trigger Function for Future Chapter Approvals
CREATE OR REPLACE FUNCTION public.credit_chapter_approval_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author_id uuid;
  _already_rewarded boolean;
  _reward numeric := 200;
  _story_title text;
BEGIN
  -- Only fire when status changes TO 'published'
  IF NEW.status <> 'published' THEN RETURN NEW; END IF;
  IF OLD.status = 'published' THEN RETURN NEW; END IF;

  -- Get Author ID from parent Story table
  SELECT author_id, title INTO _author_id, _story_title FROM public.stories WHERE id = NEW.story_id;
  IF _author_id IS NULL THEN RETURN NEW; END IF;

  -- Check if reward was already given for this chapter
  SELECT EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE user_id = _author_id
      AND type = 'story_reward'
      AND meta->>'chapter_id' = NEW.id::text
      AND status = 'completed'
  ) INTO _already_rewarded;

  IF _already_rewarded THEN RETURN NEW; END IF;

  -- Credit ₦200 to the author's wallet
  UPDATE public.wallet_balances
  SET balance = balance + _reward,
      total_earnings = total_earnings + _reward,
      updated_at = now()
  WHERE user_id = _author_id;

  IF NOT FOUND THEN
    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
    VALUES (_author_id, _reward, _reward);
  END IF;

  -- Log the transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
  VALUES (
    _author_id,
    _reward,
    'story_reward',
    'completed',
    format('Chapter %s Approved: "%s" — ₦200 Reward', NEW.chapter_number, LEFT(NEW.title, 40)),
    jsonb_build_object('chapter_id', NEW.id, 'chapter_title', NEW.title, 'story_id', NEW.story_id, 'story_title', _story_title)
  );

  RETURN NEW;
END;
$$;

-- 2. Drop existing trigger if any, then bind to story_chapters
DROP TRIGGER IF EXISTS trg_chapter_approval_reward ON public.story_chapters;
CREATE TRIGGER trg_chapter_approval_reward
AFTER UPDATE OF status ON public.story_chapters
FOR EACH ROW EXECUTE FUNCTION public.credit_chapter_approval_reward();

-- 3. RETROACTIVE REWARDS: Pay ₦200 for previously published chapters
DO $$
DECLARE
    _chapter RECORD;
    _author_id uuid;
    _story_title text;
    _reward numeric := 200;
    _already_rewarded boolean;
    _counter integer := 0;
BEGIN
    FOR _chapter IN 
        SELECT id, story_id, chapter_number, title 
        FROM public.story_chapters 
        WHERE status = 'published'
    LOOP
        SELECT author_id, title INTO _author_id, _story_title FROM public.stories WHERE id = _chapter.story_id;
        
        IF _author_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.wallet_transactions
                WHERE user_id = _author_id
                  AND type = 'story_reward'
                  AND meta->>'chapter_id' = _chapter.id::text
            ) INTO _already_rewarded;

            IF NOT _already_rewarded THEN
                UPDATE public.wallet_balances
                SET balance = balance + _reward,
                    total_earnings = total_earnings + _reward,
                    updated_at = now()
                WHERE user_id = _author_id;

                IF NOT FOUND THEN
                    INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
                    VALUES (_author_id, _reward, _reward);
                END IF;

                INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
                VALUES (
                    _author_id,
                    _reward,
                    'story_reward',
                    'completed',
                    format('Chapter %s Approved: "%s" — ₦200 Reward (Retroactive)', _chapter.chapter_number, LEFT(_chapter.title, 35)),
                    jsonb_build_object('chapter_id', _chapter.id, 'chapter_title', _chapter.title, 'story_id', _chapter.story_id, 'story_title', _story_title, 'is_retroactive', true)
                );
                
                _counter := _counter + 1;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully applied retroactive rewards for % chapters.', _counter;
END;
$$;

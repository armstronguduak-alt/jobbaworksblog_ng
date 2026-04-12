-- Stories Feature Schema update
-- Save this file and execute it in your Supabase SQL Editor

-- 1. Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    author_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    cover_image_url TEXT,
    description TEXT,
    genres TEXT[] DEFAULT '{}',
    age_rating TEXT DEFAULT 'general',
    status TEXT DEFAULT 'draft', -- draft, under_review, published, rejected, needs_revision
    admin_feedback TEXT,
    total_reads INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Story Chapters Table
CREATE TABLE IF NOT EXISTS public.story_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, under_review, published, rejected
    admin_feedback TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(story_id, chapter_number)
);

-- 3. Chapter Read Logs (to prevent double-earning points)
CREATE TABLE IF NOT EXISTS public.story_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.story_chapters(id) ON DELETE CASCADE,
    earned_points NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, chapter_id)
);

-- 4. Chapter Comments
CREATE TABLE IF NOT EXISTS public.story_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.story_chapters(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RPC function to safely award points for reading
CREATE OR REPLACE FUNCTION public.log_chapter_read(
  _user_id UUID,
  _chapter_id UUID,
  _story_id UUID,
  _reward_amount NUMERIC
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tx_id UUID;
  _existing UUID;
BEGIN
  -- Check if already read
  SELECT id INTO _existing FROM public.story_reads WHERE user_id = _user_id AND chapter_id = _chapter_id;
  IF _existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Chapter already read and reward claimed.');
  END IF;

  -- Log the read
  INSERT INTO public.story_reads (user_id, chapter_id, earned_points) VALUES (_user_id, _chapter_id, _reward_amount);
  
  -- Update chapter totals and story totals
  UPDATE public.stories SET total_reads = total_reads + 1 WHERE id = _story_id;

  -- Award points
  UPDATE public.wallet_balances 
  SET balance = balance + _reward_amount, total_earnings = total_earnings + _reward_amount 
  WHERE user_id = _user_id;

  INSERT INTO public.wallet_transactions (user_id, amount, type, status, description)
  VALUES (_user_id, _reward_amount, 'reading_bonus', 'completed', 'Read reward for story chapter')
  RETURNING id INTO _tx_id;

  RETURN jsonb_build_object('success', true, 'message', 'Read logged successfully.', 'reward', _reward_amount);
END;
$$;

-- RLS Policies For Stories 
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Allow public read of published stories
CREATE POLICY "Public can read published stories" ON public.stories FOR SELECT USING (status = 'published');
CREATE POLICY "Authors can read own stories" ON public.stories FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Authors can insert own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update own stories" ON public.stories FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins have full access to stories" ON public.stories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Public can read published chapters" ON public.story_chapters FOR SELECT USING (status = 'published');
CREATE POLICY "Authors can read own chapters" ON public.story_chapters FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_chapters.story_id AND author_id = auth.uid())
);
CREATE POLICY "Authors can write own chapters" ON public.story_chapters FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_chapters.story_id AND author_id = auth.uid())
);
CREATE POLICY "Admins have full access to chapters" ON public.story_chapters FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Users can read/write own logs" ON public.story_reads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert comments" ON public.story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view comments" ON public.story_comments FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';

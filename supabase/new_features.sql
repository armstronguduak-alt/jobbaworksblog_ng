-- =======================================================
-- JOBBAWORKS - COMMUNITY & SOCIAL FEATURES MIGRATION
-- =======================================================

-- 1. Followers Table
CREATE TABLE IF NOT EXISTS public.followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Enable RLS for followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read followers" ON public.followers;
CREATE POLICY "Anyone can read followers" 
ON public.followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.followers;
CREATE POLICY "Users can follow others" 
ON public.followers FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.followers;
CREATE POLICY "Users can unfollow" 
ON public.followers FOR DELETE TO authenticated 
USING (auth.uid() = follower_id);


-- 2. Follower Count Cache on Profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false; -- Admin override

-- Function to safely Follow a user
CREATE OR REPLACE FUNCTION follow_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.followers (follower_id, following_id)
    VALUES (auth.uid(), target_user_id)
    ON CONFLICT DO NOTHING;
    
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE user_id = target_user_id;
    UPDATE public.profiles SET following_count = following_count + 1 WHERE user_id = auth.uid();
END;
$$;

-- Function to Unfollow a user
CREATE OR REPLACE FUNCTION unfollow_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.followers WHERE follower_id = auth.uid() AND following_id = target_user_id;
    
    IF FOUND THEN
        UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE user_id = target_user_id;
        UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE user_id = auth.uid();
    END IF;
END;
$$;


-- 3. Community Tasks Tracking
CREATE TABLE IF NOT EXISTS public.community_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    task_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'start_task', -- 'start_task', 'joined', 'pending_review', 'approved', 'rejected'
    reward_claimed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, task_name)
);

ALTER TABLE public.community_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own tasks" ON public.community_tasks;
CREATE POLICY "Users can read own tasks" 
ON public.community_tasks FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can create own tasks" ON public.community_tasks;
CREATE POLICY "Users can insert own tasks" 
ON public.community_tasks FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tasks" ON public.community_tasks;
CREATE POLICY "Users can update own tasks" 
ON public.community_tasks FOR UPDATE TO authenticated 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin'));

-- Set Community Links in System Settings
INSERT INTO public.system_settings (key, value, is_public) 
VALUES ('community_links', '{"telegram": "https://t.me/jobbaworks", "whatsapp": "https://chat.whatsapp.com/jobbaworks"}', true)
ON CONFLICT (key) DO NOTHING;

-- Set Community Reward in System Settings
INSERT INTO public.system_settings (key, value, is_public) 
VALUES ('community_reward', '{"amount": 500, "currency": "NGN"}', true)
ON CONFLICT (key) DO NOTHING;

-- Define Article Notification Function for Admin Approval
CREATE OR REPLACE FUNCTION create_article_notifications(p_article_id UUID, p_author_id UUID, p_title TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    f_record RECORD;
BEGIN
    FOR f_record IN SELECT follower_id FROM public.followers WHERE following_id = p_author_id LOOP
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            f_record.follower_id,
            'New Article Published',
            'An author you follow just published: ' || p_title,
            'article_published',
            p_article_id
        );
    END LOOP;
END;
$$;

SELECT 'Migration completed.' as status;

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS TABLE & POLICIES
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- 3. RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role / admin can insert notifications for any user
CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 4. Enable realtime for notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Notify user when article is approved/rejected
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_article_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.author_user_id,
        'article_approved',
        'Article Approved! 🎉',
        'Your article "' || LEFT(NEW.title, 60) || '" has been approved and is now live.',
        '/article/' || NEW.slug
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.author_user_id,
        'article_rejected',
        'Article Needs Revision',
        'Your article "' || LEFT(NEW.title, 60) || '" was not approved. Please review and resubmit.',
        '/articles'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_article_status ON public.posts;
CREATE TRIGGER trg_notify_article_status
  AFTER UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_article_status_change();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Notify user when story is approved/rejected
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_story_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.author_id,
        'story_approved',
        'Story Approved! 📖🎉',
        'Your story "' || LEFT(NEW.title, 60) || '" has been approved and is now live. You earned ₦1,000!',
        '/stories/' || NEW.id
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        NEW.author_id,
        'story_rejected',
        'Story Needs Revision',
        'Your story "' || LEFT(NEW.title, 60) || '" was not approved. Please review and resubmit.',
        '/my-stories'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_story_status ON public.stories;
CREATE TRIGGER trg_notify_story_status
  AFTER UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION notify_story_status_change();

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Notify user when they get a new follower
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT name INTO follower_name FROM public.profiles WHERE user_id = NEW.follower_id;
  
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.following_id,
    'new_follower',
    'New Follower! 👋',
    COALESCE(follower_name, 'Someone') || ' started following you.',
    '/profile'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_follower ON public.followers;
CREATE TRIGGER trg_notify_new_follower
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();

-- Done!
SELECT 'Notifications system created successfully' AS status;

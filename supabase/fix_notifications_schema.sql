-- =========================================================
-- FIX NOTIFICATIONS SCHEMA
-- Run this in Supabase SQL Editor if you get a "column does not exist" error
-- =========================================================

DO $$
BEGIN
    -- Add type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
        ALTER TABLE public.notifications ADD COLUMN type text NOT NULL DEFAULT 'system';
    END IF;

    -- Add title if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
        ALTER TABLE public.notifications ADD COLUMN title text NOT NULL DEFAULT 'Notification';
    END IF;

    -- Add link if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='link') THEN
        ALTER TABLE public.notifications ADD COLUMN link text;
    END IF;

    -- Add metadata if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata jsonb DEFAULT '{}';
    END IF;

    -- Add message if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
        ALTER TABLE public.notifications ADD COLUMN message text NOT NULL DEFAULT '';
    END IF;
    
    -- Ensure related_id exists (From new_features.sql)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_id uuid;
    END IF;
END $$;

-- =========================================================
-- STEP 1: RUN THIS BLOCK FIRST (alone, by itself)
-- Adds 'story_reward' to the transaction_type enum
-- =========================================================
DO $$
BEGIN
  ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'story_reward';
EXCEPTION WHEN others THEN NULL;
END $$;

-- =========================================================
-- IMPORTANT: After running STEP 1 above, press RUN.
-- Then CLEAR the editor and paste ONLY STEP 2 below, 
-- and press RUN again. PostgreSQL requires new enum values 
-- to be committed in a separate transaction before use.
-- =========================================================

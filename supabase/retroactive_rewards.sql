-- =========================================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Retroactive Rewards for Already Approved Articles
-- =========================================================

-- 1. Create the RPC function that Admins can call from frontend (optional)
-- Or you can just execute the DO block below once manually.

DO $$
DECLARE
    _post RECORD;
    _reward numeric := 500;
    _already_rewarded boolean;
    _counter integer := 0;
BEGIN
    -- Loop through all currently approved posts
    FOR _post IN 
        SELECT id, author_user_id, title 
        FROM public.posts 
        WHERE status = 'approved' AND author_user_id IS NOT NULL
    LOOP
        -- Check if reward already exists for this exact post
        SELECT EXISTS (
            SELECT 1 FROM public.wallet_transactions
            WHERE user_id = _post.author_user_id
              AND type = 'post_approval_reward'
              AND meta->>'post_id' = _post.id::text
        ) INTO _already_rewarded;

        -- If not rewarded yet, give them ₦500
        IF NOT _already_rewarded THEN
            
            -- 1. Update Wallet Balance
            UPDATE public.wallet_balances
            SET balance = balance + _reward,
                total_earnings = total_earnings + _reward,
                post_earnings = COALESCE(post_earnings, 0) + _reward,
                updated_at = now()
            WHERE user_id = _post.author_user_id;

            -- If they somehow don't have a wallet, create it
            IF NOT FOUND THEN
                INSERT INTO public.wallet_balances (user_id, balance, total_earnings, post_earnings)
                VALUES (_post.author_user_id, _reward, _reward, _reward);
            END IF;

            -- 2. Log The Transaction
            INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
            VALUES (
                _post.author_user_id,
                _reward,
                'post_approval_reward',
                'completed',
                format('Article "%s" approved — ₦500 Author Reward (Retroactive)', LEFT(_post.title, 50)),
                jsonb_build_object('post_id', _post.id, 'article_title', _post.title, 'is_retroactive', true)
            );
            
            _counter := _counter + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully applied retroactive rewards for % articles.', _counter;
END;
$$;

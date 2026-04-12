-- Script to retroactively credit referrers for users who bought plans before the system was fully stable.

DO $$
DECLARE
    r RECORD;
    referrer_record RECORD;
    existing_bonus_count INTEGER;
BEGIN
    FOR r IN
        -- Find all users who have a referred_by_code and currently have a purchased plan
        SELECT p.user_id, p.referred_by_code, p.username, us.plan_id, sp.price
        FROM public.profiles p
        JOIN public.user_subscriptions us ON us.user_id = p.user_id
        JOIN public.subscription_plans sp ON sp.id = us.plan_id
        WHERE p.referred_by_code IS NOT NULL AND us.plan_id IS NOT NULL AND us.plan_id != 'free'
    LOOP
        -- Find the referrer's corresponding profile
        SELECT * INTO referrer_record
        FROM public.profiles
        WHERE referral_code = r.referred_by_code OR username = r.referred_by_code LIMIT 1;

        IF FOUND THEN
            -- Check if referrer already received a 'referral_bonus' for this specific user
            SELECT COUNT(*) INTO existing_bonus_count
            FROM public.wallet_transactions
            WHERE user_id = referrer_record.user_id 
              AND type = 'referral_bonus'
              AND (meta->>'referred_user_id')::TEXT = r.user_id::TEXT;

            IF existing_bonus_count = 0 THEN
                -- Insert a 25% referral bonus transaction
                INSERT INTO public.wallet_transactions (
                    user_id,
                    type,
                    amount,
                    status,
                    meta
                )
                VALUES (
                    referrer_record.user_id,
                    'referral_bonus',
                    (r.price * 0.25),
                    'completed',
                    jsonb_build_object(
                         'referred_user_id', r.user_id, 
                         'referred_username', r.username, 
                         'plan_id', r.plan_id
                    )
                );

                -- Update the referrer's wallet balance
                UPDATE public.wallet_balances
                SET balance = balance + (r.price * 0.25),
                    referral_earnings = referral_earnings + (r.price * 0.25),
                    total_earnings = total_earnings + (r.price * 0.25)
                WHERE user_id = referrer_record.user_id;

                RAISE NOTICE 'Credited % with % for referring %.', referrer_record.username, (r.price * 0.25), r.username;
            END IF;
        END IF;

    END LOOP;
END $$;

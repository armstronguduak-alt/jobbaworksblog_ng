-- =========================================================
-- UPDATE INITIALIZE_MY_ACCOUNT RPC
-- Adds support for country, country_code, is_nigerian, and currency
-- =========================================================

-- We drop previous signatures just to be safe
DROP FUNCTION IF EXISTS public.initialize_my_account(text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.initialize_my_account(text, text, text, text, text, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.initialize_my_account(text, text, text, text, text, text, text, text, text, text, boolean, text);

CREATE OR REPLACE FUNCTION public.initialize_my_account(
  _name text,
  _email text,
  _phone text,
  _username text,
  _gender text,
  _avatar_url text,
  _referred_by_code text,
  _country text DEFAULT NULL,
  _country_code text DEFAULT NULL,
  _is_nigerian boolean DEFAULT true,
  _currency text DEFAULT 'NGN'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _referrer_id uuid;
  _new_referral_code text;
BEGIN
  -- Get the authenticating user ID
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Generate a unique referral code for this new user
  _new_referral_code := lower(regexp_replace(_username, '\W+', '', 'g')) || floor(random() * 900 + 100)::text;

  -- 2. Create or Update Profile
  INSERT INTO public.profiles (
    user_id, 
    email, 
    name, 
    username, 
    avatar_url, 
    phone, 
    gender, 
    referral_code, 
    referrals_count,
    country,
    country_code,
    phone_number,
    is_nigerian,
    currency
  )
  VALUES (
    _user_id, 
    _email, 
    _name, 
    _username, 
    _avatar_url, 
    _phone, 
    _gender, 
    _new_referral_code, 
    0,
    _country,
    _country_code,
    _phone,
    _is_nigerian,
    _currency
  )
  ON CONFLICT (user_id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    phone = EXCLUDED.phone,
    gender = EXCLUDED.gender,
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    phone_number = EXCLUDED.phone_number,
    is_nigerian = EXCLUDED.is_nigerian,
    currency = EXCLUDED.currency;

  -- 3. Create default Wallet Balance
  INSERT INTO public.wallet_balances (user_id, balance, total_earnings)
  VALUES (_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Assign default standard user role
  INSERT INTO public.user_roles (user_id, role, permissions)
  VALUES (_user_id, 'user', '["content","transactions","tasks","promotions"]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  -- 5. Process Referral (If provided and hasn't been credited yet)
  IF _referred_by_code IS NOT NULL AND _referred_by_code <> '' THEN
      -- Find the referrer
      SELECT user_id INTO _referrer_id FROM public.profiles WHERE referral_code = _referred_by_code;
      
      IF _referrer_id IS NOT NULL THEN
        -- Check if already rewarded to prevent double counting
        IF NOT EXISTS (
            SELECT 1 FROM public.wallet_transactions 
            WHERE type = 'referral_bonus' 
            AND meta->>'referred_user_id' = _user_id::text
        ) THEN
            
            -- Increment Referrer's count
            UPDATE public.profiles SET referrals_count = referrals_count + 1 WHERE user_id = _referrer_id;
            
            -- Reward the referrer (e.g., 200 Naira)
            -- Note: For global users, 200 NGN equivalent or standard $0.20? 
            -- Keeping it 200 for now, display will be managed by UI or another layer.
            UPDATE public.wallet_balances 
            SET balance = balance + 200, 
                total_earnings = total_earnings + 200, 
                updated_at = now() 
            WHERE user_id = _referrer_id;

            -- Log transaction
            INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, meta)
            VALUES (
                _referrer_id, 
                200, 
                'referral_bonus', 
                'completed', 
                'Referral Bonus for inviting: @' || _username,
                jsonb_build_object('referred_user_id', _user_id, 'referred_username', _username)
            );

        END IF;

        -- Record the referral relationship
        INSERT INTO public.referral_relationships (referrer_id, referred_id)
        VALUES (_referrer_id, _user_id)
        ON CONFLICT DO NOTHING;
        
      END IF;
  END IF;

  -- 6. Add welcome notification
  INSERT INTO public.notifications (user_id, title, message, type, is_read)
  VALUES (_user_id, 'Welcome to JobbaWorks!', 'Your account has been successfully set up. Start reading, engaging, and earning today.', 'system', false);
  
END;
$$;

GRANT EXECUTE ON FUNCTION public.initialize_my_account(text, text, text, text, text, text, text, text, text, boolean, text) TO authenticated;

-- =========================================================
-- GLOBAL USER SUPPORT MIGRATION
-- Adds country, phone, currency context to profiles, 
-- USDT addresses to system settings, and USD pricing to plans.
-- =========================================================

-- 1. Add fields to profiles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country') THEN
        ALTER TABLE public.profiles ADD COLUMN country text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='country_code') THEN
        ALTER TABLE public.profiles ADD COLUMN country_code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='is_nigerian') THEN
        ALTER TABLE public.profiles ADD COLUMN is_nigerian boolean DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='currency') THEN
        ALTER TABLE public.profiles ADD COLUMN currency text DEFAULT 'NGN';
    END IF;
END $$;

-- 2. Add USD pricing to subscription_plans
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscription_plans' AND column_name='price_usd') THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_usd numeric DEFAULT 0;
    END IF;
END $$;

-- Seed default USD prices for existing plans
UPDATE public.subscription_plans SET price_usd = 0 WHERE id = 'free';
UPDATE public.subscription_plans SET price_usd = 5 WHERE id = 'starter';
UPDATE public.subscription_plans SET price_usd = 10 WHERE id = 'pro';
UPDATE public.subscription_plans SET price_usd = 20 WHERE id = 'elite';
UPDATE public.subscription_plans SET price_usd = 40 WHERE id = 'vip';
UPDATE public.subscription_plans SET price_usd = 80 WHERE id = 'executive';
UPDATE public.subscription_plans SET price_usd = 150 WHERE id = 'platinum';

-- 3. Add USDT Payment Addresses to system_settings if not exists
INSERT INTO public.system_settings (key, value, is_public) 
VALUES (
    'usdt_addresses', 
    '{"addresses": ["0xYourUSDTAddressHere1", "0xYourUSDTAddressHere2", "0xYourUSDTAddressHere3", "0xYourUSDTAddressHere4", "0xYourUSDTAddressHere5"]}', 
    true
)
ON CONFLICT (key) DO NOTHING;

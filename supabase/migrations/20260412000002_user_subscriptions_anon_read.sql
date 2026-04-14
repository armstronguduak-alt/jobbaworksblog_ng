-- Allow anon to read user_subscriptions for plan_id checks (verified badges)
DROP POLICY IF EXISTS "Allow public read on user_subscriptions" ON public.user_subscriptions;
CREATE POLICY "Allow public read on user_subscriptions" ON public.user_subscriptions FOR SELECT USING (true);

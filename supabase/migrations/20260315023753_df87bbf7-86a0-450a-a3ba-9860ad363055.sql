-- Security hardening for sensitive financial/subscription/moderation tables

-- 1) wallet_balances: remove direct user writes, keep admin-only writes
DROP POLICY IF EXISTS wallet_balances_write_own_or_admin ON public.wallet_balances;

CREATE POLICY wallet_balances_admin_insert
ON public.wallet_balances
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY wallet_balances_admin_update
ON public.wallet_balances
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY wallet_balances_admin_delete
ON public.wallet_balances
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) user_subscriptions: remove self-assignment/upgrades, admin-only writes
DROP POLICY IF EXISTS subscriptions_insert_own_or_admin ON public.user_subscriptions;
DROP POLICY IF EXISTS subscriptions_update_own_or_admin ON public.user_subscriptions;

CREATE POLICY subscriptions_admin_insert
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY subscriptions_admin_update
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY subscriptions_admin_delete
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) comment_earnings: remove direct user insert of arbitrary earnings
DROP POLICY IF EXISTS comment_earnings_insert_own_or_admin ON public.comment_earnings;

CREATE POLICY comment_earnings_admin_insert
ON public.comment_earnings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) posts moderation integrity: remove broad author update policy
DROP POLICY IF EXISTS posts_author_update_or_admin ON public.posts;

-- Authors can only edit their own unmoderated content (not approved posts)
CREATE POLICY posts_author_update_safe
ON public.posts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = author_user_id
  AND status IN ('draft'::public.post_status, 'pending'::public.post_status, 'rejected'::public.post_status)
)
WITH CHECK (
  auth.uid() = author_user_id
  AND status IN ('draft'::public.post_status, 'pending'::public.post_status, 'rejected'::public.post_status)
  AND approved_by_user_id IS NULL
  AND approved_at IS NULL
);

-- Moderators/Admins can update any post for moderation workflow
CREATE POLICY posts_moderator_admin_update
ON public.posts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'moderator'::public.app_role)
);

-- 5) Trusted SECURITY DEFINER functions for controlled mutations

-- Ensure wallet row exists for current user (safe initializer)
CREATE OR REPLACE FUNCTION public.initialize_my_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.wallet_balances (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Ensure free subscription row exists for current user (safe initializer)
CREATE OR REPLACE FUNCTION public.initialize_my_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id)
  VALUES (_uid, 'free'::public.plan_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Admin/service-role-only plan assignment (use after payment verification)
CREATE OR REPLACE FUNCTION public.assign_user_plan(_user_id uuid, _plan_id public.plan_id)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _caller uuid := auth.uid();
  _role text := COALESCE(auth.role(), '');
BEGIN
  IF _role <> 'service_role' AND NOT public.has_role(_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Not authorized to assign plans';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, plan_id)
  VALUES (_user_id, _plan_id)
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    updated_at = now();
END;
$$;

-- Moderator/admin-only status transition function
CREATE OR REPLACE FUNCTION public.moderate_post_status(
  _post_id uuid,
  _new_status public.post_status,
  _moderation_summary text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _caller uuid := auth.uid();
BEGIN
  IF NOT (
    public.has_role(_caller, 'admin'::public.app_role)
    OR public.has_role(_caller, 'moderator'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized to moderate posts';
  END IF;

  IF _new_status NOT IN ('pending'::public.post_status, 'approved'::public.post_status, 'rejected'::public.post_status) THEN
    RAISE EXCEPTION 'Invalid moderation status';
  END IF;

  UPDATE public.posts
  SET
    status = _new_status,
    moderation_summary = COALESCE(_moderation_summary, moderation_summary),
    approved_by_user_id = CASE WHEN _new_status = 'approved'::public.post_status THEN _caller ELSE NULL END,
    approved_at = CASE WHEN _new_status = 'approved'::public.post_status THEN now() ELSE NULL END,
    published_at = CASE WHEN _new_status = 'approved'::public.post_status THEN COALESCE(published_at, now()) ELSE published_at END,
    updated_at = now()
  WHERE id = _post_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Post not found';
  END IF;
END;
$$;

-- Allow authenticated users to call safe initializers
GRANT EXECUTE ON FUNCTION public.initialize_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_my_subscription() TO authenticated;

-- Restrict privileged mutators to authenticated (authorization enforced inside functions)
GRANT EXECUTE ON FUNCTION public.assign_user_plan(uuid, public.plan_id) TO authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_post_status(uuid, public.post_status, text) TO authenticated;
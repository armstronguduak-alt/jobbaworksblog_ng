-- Add flagged status
ALTER TYPE public.user_status ADD VALUE IF NOT EXISTS 'flagged';

-- Create an RPC to toggle flagged status
CREATE OR REPLACE FUNCTION admin_toggle_user_flag(p_user_id uuid, p_is_flagged boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.profiles
  SET status = CASE WHEN p_is_flagged THEN 'flagged'::public.user_status ELSE 'active'::public.user_status END,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

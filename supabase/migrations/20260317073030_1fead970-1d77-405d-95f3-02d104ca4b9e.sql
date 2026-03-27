-- Promotions table for public promotional campaigns managed by admins
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  cta_text TEXT NOT NULL DEFAULT 'Learn more',
  cta_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promotions_public_read_active" ON public.promotions;
CREATE POLICY "promotions_public_read_active"
ON public.promotions
FOR SELECT
TO public
USING (is_active = true);

DROP POLICY IF EXISTS "promotions_admin_manage" ON public.promotions;
CREATE POLICY "promotions_admin_manage"
ON public.promotions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions (is_active, created_at DESC);

DROP TRIGGER IF EXISTS set_promotions_updated_at ON public.promotions;
CREATE TRIGGER set_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- SEO metadata support for generated and manually authored posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS seo_meta_title TEXT,
ADD COLUMN IF NOT EXISTS seo_meta_description TEXT;

-- Promote a specific existing user to admin role
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = lower('williegabriel58@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
-- Create promotions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotions', 'promotions', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Read Access on Promotions Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotions');

-- Policies for authenticated inserts
CREATE POLICY "Authenticated users can upload promotions"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promotions' AND auth.role() = 'authenticated');

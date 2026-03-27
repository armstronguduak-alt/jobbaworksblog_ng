-- Create post_images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post_images', 'post_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Read Access on Post Images Bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'post_images');

-- Policies for authenticated inserts
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post_images' AND auth.role() = 'authenticated');

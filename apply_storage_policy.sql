-- ─────────────────────────────────────────────
-- STORAGE POLICIES FOR PRODUCT-IMAGES
-- ─────────────────────────────────────────────

-- Ensure the product-images bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product-images
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow public insert access to product-images (for mockups during checkout)
DROP POLICY IF EXISTS "Public Insert Access" ON storage.objects;
CREATE POLICY "Public Insert Access" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );

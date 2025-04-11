-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view KYC documents" ON storage.objects;

-- Create new policies with more specific names
CREATE POLICY "kyc_documents_user_upload_policy"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'kyc_documents' AND 
  (auth.uid()::text = SPLIT_PART(name, '/', 1))
);

CREATE POLICY "kyc_documents_user_view_policy" 
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'kyc_documents' AND 
  (auth.uid()::text = SPLIT_PART(name, '/', 1))
);

CREATE POLICY "kyc_documents_public_view_policy"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'kyc_documents');

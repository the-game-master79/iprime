-- Drop existing storage policies first
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admin users can access all KYC documents" ON storage.objects;

-- Drop existing KYC table and its policies if exists
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'kyc') THEN
        DROP POLICY IF EXISTS "Users can insert their own KYC records" ON kyc;
        DROP POLICY IF EXISTS "Users can view their own KYC records" ON kyc;
        DROP POLICY IF EXISTS "Users can update their own KYC records" ON kyc;
        DROP POLICY IF EXISTS "Admin users have full access to KYC records" ON kyc;
        DROP TABLE kyc;
    END IF;
END $$;

-- Create storage bucket if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM storage.buckets WHERE id = 'kyc_documents') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('kyc_documents', 'kyc_documents', false);
    END IF;
END $$;

-- Create new KYC table
CREATE TABLE kyc (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    postal_code TEXT,
    document_type TEXT NOT NULL,
    document_number TEXT NOT NULL,
    document_front TEXT NOT NULL,
    document_back TEXT NOT NULL,
    occupation TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE kyc ENABLE ROW LEVEL SECURITY;

-- Policies for KYC table
CREATE POLICY "Users can insert their own KYC"
ON kyc FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own KYC"
ON kyc FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending KYC"
ON kyc FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin users have full access to KYC"
ON kyc FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Storage bucket policies
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'kyc_documents' 
    AND (auth.uid()::text = SPLIT_PART(name, '/', 1))
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'kyc_documents' 
    AND (auth.uid()::text = SPLIT_PART(name, '/', 1))
);

CREATE POLICY "Admin users can access all KYC documents"
ON storage.objects FOR ALL TO authenticated
USING (
    bucket_id = 'kyc_documents'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_kyc_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_timestamp
    BEFORE UPDATE ON kyc
    FOR EACH ROW
    EXECUTE FUNCTION update_kyc_timestamp();

-- Grant necessary permissions
GRANT ALL ON kyc TO authenticated;
GRANT ALL ON kyc TO service_role;

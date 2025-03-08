-- Drop existing table if it exists
DROP TABLE IF EXISTS public.withdrawals;

-- Create enum for network types if it doesn't exist
DO $$ BEGIN
    CREATE TYPE network_type AS ENUM ('TRC20', 'ERC20', 'BEP20');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create withdrawals table with proper relations
CREATE TABLE public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(18,2) NOT NULL CHECK (amount > 0),
    address TEXT NOT NULL,
    network_type network_type NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create foreign key reference to profiles
ALTER TABLE public.withdrawals
ADD CONSTRAINT fk_withdrawals_profiles
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawals FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can create their own withdrawals"
ON public.withdrawals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.withdrawals;
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawals FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Grant permissions
GRANT ALL ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;

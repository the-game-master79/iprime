-- Create ranks table
CREATE TABLE IF NOT EXISTS public.ranks (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text NOT NULL,
    business_amount numeric NOT NULL,
    bonus numeric NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;

-- Create policy for read access
CREATE POLICY "Allow read access for all users"
    ON public.ranks
    FOR SELECT
    USING (true);

-- Create policy for insert/update (admin only)
CREATE POLICY "Allow insert/update for admins only"
    ON public.ranks
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Insert default ranks
INSERT INTO public.ranks (title, business_amount, bonus)
VALUES 
    ('Bronze', 0, 0),
    ('Silver', 50000, 500),
    ('Gold', 100000, 1000),
    ('Platinum', 500000, 5000),
    ('Diamond', 1000000, 10000);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_ranks_business_amount ON public.ranks(business_amount);

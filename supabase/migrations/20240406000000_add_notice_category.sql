-- Add category column to notices table
ALTER TABLE public.notices
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('admin', 'referral', 'system')) DEFAULT 'admin';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category);

-- Update existing notices to have admin category
UPDATE public.notices 
SET category = 'admin' 
WHERE category IS NULL;

-- Make category required
ALTER TABLE public.notices
ALTER COLUMN category SET NOT NULL;

-- Update notice creation function if exists
CREATE OR REPLACE FUNCTION create_notice(
  p_title text,
  p_content text,
  p_type text,
  p_category text DEFAULT 'admin',
  p_user_id uuid DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_notice_id uuid;
BEGIN
  INSERT INTO notices (title, content, type, category, user_id)
  VALUES (p_title, p_content, p_type, p_category, p_user_id)
  RETURNING id INTO new_notice_id;
  
  RETURN new_notice_id;
END;
$$;

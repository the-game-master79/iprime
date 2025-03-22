-- Add plans column to existing table
ALTER TABLE public.new_users_marquee 
ADD COLUMN IF NOT EXISTS plans text NOT NULL DEFAULT 'Basic';

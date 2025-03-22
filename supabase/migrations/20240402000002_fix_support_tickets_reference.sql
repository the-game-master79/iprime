-- First drop the existing foreign key constraint
ALTER TABLE support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE support_tickets
ADD CONSTRAINT support_tickets_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);

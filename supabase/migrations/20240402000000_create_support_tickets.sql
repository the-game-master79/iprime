CREATE TABLE support_tickets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    issue_type text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'Pending',
    ai_response text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    resolved_at timestamptz,
    is_escalated boolean DEFAULT false,
    escalated_at timestamptz,
    CONSTRAINT valid_status CHECK (status IN ('Pending', 'Active', 'Closed'))
);

-- Create index for faster queries
CREATE INDEX support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX support_tickets_status_idx ON support_tickets(status);

-- Add RLS policies
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tickets"
    ON support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
    ON support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

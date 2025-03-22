CREATE TABLE support_messages (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin')),
    message text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their ticket messages"
    ON support_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM support_tickets
        WHERE support_tickets.id = ticket_id
        AND support_tickets.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert messages"
    ON support_messages FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM support_tickets
        WHERE support_tickets.id = ticket_id
        AND support_tickets.user_id = auth.uid()
    ));

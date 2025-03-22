-- Add admin policies for support tickets
CREATE POLICY "Admin can view all tickets"
ON support_tickets FOR SELECT
TO authenticated
USING (auth.jwt()->>'role' = 'authenticated');

CREATE POLICY "Admin can update tickets"
ON support_tickets FOR UPDATE
TO authenticated
USING (auth.jwt()->>'role' = 'authenticated');

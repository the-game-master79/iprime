CREATE TABLE commission_structures (
    id SERIAL PRIMARY KEY,
    level INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add related_investment column to transactions table if not exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_investment DECIMAL(15,2);

-- Insert default commission structure
INSERT INTO commission_structures (level, percentage, description) VALUES
    (1, 10.00, 'Direct referrals'),
    (2, 5.00, 'Second-level referrals'),
    (3, 2.00, 'Third-level referrals');

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updating timestamp
CREATE TRIGGER update_commission_structures_updated_at
    BEFORE UPDATE ON commission_structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop any existing commission triggers if they exist
DROP TRIGGER IF EXISTS create_commission_transaction ON investments;
DROP FUNCTION IF EXISTS create_commission_transaction();

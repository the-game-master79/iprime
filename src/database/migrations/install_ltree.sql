-- Attempt to create ltree extension if we have privileges
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_roles 
        WHERE rolname = current_user 
        AND rolsuper
    ) THEN
        CREATE EXTENSION IF NOT EXISTS ltree;
    END IF;
END $$;

-- Remove update of full_name from first_name/last_name, as those columns are removed

-- Verify changes (optional)
SELECT id, first_name, last_name, full_name 
FROM profiles 
WHERE full_name IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

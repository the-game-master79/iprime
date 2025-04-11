-- Update full_name for all existing profiles
UPDATE profiles 
SET 
    full_name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
    updated_at = NOW()
WHERE (first_name IS NOT NULL OR last_name IS NOT NULL)
AND (full_name IS NULL OR full_name != TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))));

-- Verify changes (optional)
SELECT id, first_name, last_name, full_name 
FROM profiles 
WHERE full_name IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

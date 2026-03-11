-- Fix phone number constraint to use more reliable pattern
-- The original REGEXP pattern may not work correctly in all MySQL versions
-- This uses CHAR_LENGTH to ensure exactly 10 characters and REGEXP to ensure only digits

-- Drop the old constraint (MySQL 8.0.19+)
ALTER TABLE user DROP CHECK chk_phone_format;

-- Add the new constraint with more reliable validation
ALTER TABLE user 
ADD CONSTRAINT chk_phone_format CHECK (CHAR_LENGTH(phone_number) = 10 AND phone_number REGEXP '^[0-9]+$');


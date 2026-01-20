-- Add 'for_checking' to improvement_status enum
ALTER TYPE improvement_status ADD VALUE IF NOT EXISTS 'for_checking';
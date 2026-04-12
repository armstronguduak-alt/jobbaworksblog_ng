-- Add swap to transaction_type enum
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'swap';

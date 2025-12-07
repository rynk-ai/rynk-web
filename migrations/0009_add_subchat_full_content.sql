-- Add fullMessageContent column to sub_chats table
ALTER TABLE sub_chats ADD COLUMN fullMessageContent TEXT NOT NULL DEFAULT '';

-- Update existing records with empty string as default
-- (they will be updated when users interact with them)

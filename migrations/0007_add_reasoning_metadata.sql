-- Add reasoning metadata columns to messages table
ALTER TABLE messages ADD COLUMN reasoning_content TEXT;
ALTER TABLE messages ADD COLUMN reasoning_metadata TEXT; -- JSON
ALTER TABLE messages ADD COLUMN web_annotations TEXT; -- JSON
ALTER TABLE messages ADD COLUMN model_used TEXT;

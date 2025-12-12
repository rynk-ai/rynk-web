-- Migration: Add surfaceStates column to conversations table
-- Description: This column stores JSON object for adaptive surface states (learning, guide, quiz, etc.)
-- Created: 2024-12-12

-- Add surfaceStates column to conversations table
ALTER TABLE conversations ADD COLUMN surfaceStates TEXT;

-- Note: This is a non-destructive migration that adds a nullable column.
-- Existing rows will have NULL for surfaceStates until they create/save surfaces.

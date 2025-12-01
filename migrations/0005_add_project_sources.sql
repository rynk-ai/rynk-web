-- Add projectId to conversation_sources to support project-level attachments
ALTER TABLE conversation_sources ADD COLUMN projectId TEXT;

-- Create index for faster project source lookups
CREATE INDEX IF NOT EXISTS idx_conversation_sources_projectId 
  ON conversation_sources(projectId) WHERE projectId IS NOT NULL;

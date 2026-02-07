-- Discovery Module Database Schema
-- Run this in your Supabase SQL Editor after enabling pgvector extension

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ACTION LIBRARY TABLE
-- ============================================
-- Stores registered tools/actions with vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS x_action_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL, -- e.g., 'slack', 'email', 'http', 'database'
  description TEXT NOT NULL,
  schema JSONB NOT NULL, -- Tool configuration schema
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  is_active BOOLEAN DEFAULT true,
  created_by UUID, -- User who registered this tool
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_action_library_embedding 
  ON x_action_library 
  USING hnsw (embedding vector_cosine_ops);

-- Regular indexes
CREATE INDEX IF NOT EXISTS idx_action_library_platform ON x_action_library(platform);
CREATE INDEX IF NOT EXISTS idx_action_library_is_active ON x_action_library(is_active);
CREATE INDEX IF NOT EXISTS idx_action_library_created_at ON x_action_library(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_library_name ON x_action_library(name);

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================
-- Function to find similar actions based on embedding similarity
CREATE OR REPLACE FUNCTION x_match_actions (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  name text,
  platform text,
  description text,
  schema jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    x_action_library.id,
    x_action_library.name,
    x_action_library.platform,
    x_action_library.description,
    x_action_library.schema,
    1 - (x_action_library.embedding <=> query_embedding) as similarity
  FROM x_action_library
  WHERE 
    x_action_library.is_active = true
    AND x_action_library.embedding IS NOT NULL
    AND 1 - (x_action_library.embedding <=> query_embedding) > match_threshold
  ORDER BY x_action_library.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE x_action_library ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active tools
CREATE POLICY "Anyone can view active tools"
  ON x_action_library
  FOR SELECT
  USING (is_active = true);

-- Policy: Only admins can insert (we'll check in API)
CREATE POLICY "System can insert tools"
  ON x_action_library
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can update (we'll check in API)
CREATE POLICY "System can update tools"
  ON x_action_library
  FOR UPDATE
  USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_action_library_updated_at
  BEFORE UPDATE ON x_action_library
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - Example Tools)
-- ============================================

-- Insert some example tools for testing
INSERT INTO x_action_library (name, platform, description, schema, embedding) VALUES
  (
    'slack_send_message',
    'slack',
    'Send a message to a Slack channel or user',
    '{"type": "object", "properties": {"channel": {"type": "string"}, "message": {"type": "string"}}, "required": ["channel", "message"]}'::jsonb,
    NULL -- Embedding will be generated via API
  ),
  (
    'email_send',
    'email',
    'Send an email to one or more recipients',
    '{"type": "object", "properties": {"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "subject", "body"]}'::jsonb,
    NULL
  ),
  (
    'http_request',
    'http',
    'Make an HTTP request to any URL',
    '{"type": "object", "properties": {"url": {"type": "string"}, "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE"]}, "headers": {"type": "object"}, "body": {"type": "object"}}, "required": ["url", "method"]}'::jsonb,
    NULL
  ),
  (
    'database_query',
    'database',
    'Execute a SQL query on a database',
    '{"type": "object", "properties": {"query": {"type": "string"}, "connection": {"type": "string"}}, "required": ["query"]}'::jsonb,
    NULL
  ),
  (
    'slack_invite_user',
    'slack',
    'Invite a user to a Slack workspace or channel',
    '{"type": "object", "properties": {"email": {"type": "string"}, "channel": {"type": "string"}}, "required": ["email"]}'::jsonb,
    NULL
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE x_action_library IS 'Registry of available tools/actions with vector embeddings for semantic search';
COMMENT ON COLUMN x_action_library.embedding IS 'Vector embedding (1536 dimensions) from OpenAI text-embedding-3-small';
COMMENT ON COLUMN x_action_library.schema IS 'JSON Schema defining the tool configuration parameters';
COMMENT ON COLUMN x_action_library.platform IS 'Platform/category of the tool (slack, email, http, etc.)';
COMMENT ON FUNCTION x_match_actions IS 'Semantic search function using cosine similarity on embeddings';

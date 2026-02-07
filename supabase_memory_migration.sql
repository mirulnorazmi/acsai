-- Memory Module Database Schema
-- Run this in your Supabase SQL Editor after enabling pgvector extension

-- ============================================
-- ENABLE PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ENTITY MEMORY TABLE
-- ============================================
-- Stores long-term memory facts about entities (people, projects, etc.)
CREATE TABLE IF NOT EXISTS x_entity_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL, -- Entity name (e.g., "Sarah Jones", "Project Alpha")
  fact TEXT NOT NULL, -- The actual fact/information
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Subject search index (for fast entity lookup)
CREATE INDEX IF NOT EXISTS idx_entity_memory_subject ON x_entity_memory(subject);
CREATE INDEX IF NOT EXISTS idx_entity_memory_subject_lower ON x_entity_memory(LOWER(subject));

-- User ID index (for filtering by user)
CREATE INDEX IF NOT EXISTS idx_entity_memory_user_id ON x_entity_memory(user_id);

-- Combined index for user + subject queries
CREATE INDEX IF NOT EXISTS idx_entity_memory_user_subject ON x_entity_memory(user_id, subject);

-- Vector similarity search index (HNSW for fast approximate nearest neighbor)
CREATE INDEX IF NOT EXISTS idx_entity_memory_embedding 
  ON x_entity_memory 
  USING hnsw (embedding vector_cosine_ops);

-- Created at index (for sorting)
CREATE INDEX IF NOT EXISTS idx_entity_memory_created_at ON x_entity_memory(created_at DESC);

-- ============================================
-- VECTOR SEARCH FUNCTION
-- ============================================
-- Function to find similar memory facts based on embedding similarity
CREATE OR REPLACE FUNCTION x_match_entity_memory (
  query_embedding vector(1536),
  filter_user_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  subject text,
  fact text,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    x_entity_memory.id,
    x_entity_memory.subject,
    x_entity_memory.fact,
    1 - (x_entity_memory.embedding <=> query_embedding) as similarity,
    x_entity_memory.created_at
  FROM x_entity_memory
  WHERE 
    x_entity_memory.embedding IS NOT NULL
    AND 1 - (x_entity_memory.embedding <=> query_embedding) > match_threshold
    AND (filter_user_id IS NULL OR x_entity_memory.user_id = filter_user_id)
  ORDER BY x_entity_memory.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE x_entity_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own memories
CREATE POLICY "Users can view own memories"
  ON x_entity_memory
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own memories
CREATE POLICY "Users can insert own memories"
  ON x_entity_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own memories
CREATE POLICY "Users can update own memories"
  ON x_entity_memory
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own memories
CREATE POLICY "Users can delete own memories"
  ON x_entity_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_entity_memory_updated_at
  BEFORE UPDATE ON x_entity_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Optional - Example Memory Facts)
-- ============================================

-- Insert some example memory facts for testing
-- Note: These will need user_id to be set appropriately
-- Uncomment and modify user_id values as needed

/*
INSERT INTO x_entity_memory (user_id, subject, fact, embedding) VALUES
  (
    '00000000-0000-0000-0000-000000000000', -- Replace with actual user_id
    'Sarah Jones',
    'Prefers communication via Slack, not email',
    NULL -- Embedding will be generated via API
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Project Alpha',
    'Uses Jira project key ALPHA-123 for tracking',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Dev Team',
    'Daily standup at 9 AM EST every weekday',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Sarah Jones',
    'Works remotely from Pacific timezone',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'Project Beta',
    'Deployment window is Fridays 2-4 PM',
    NULL
  )
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get all facts for a specific entity
CREATE OR REPLACE FUNCTION get_entity_facts(
  entity_name text,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  fact text,
  created_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    x_entity_memory.id,
    x_entity_memory.fact,
    x_entity_memory.created_at
  FROM x_entity_memory
  WHERE 
    LOWER(x_entity_memory.subject) LIKE LOWER('%' || entity_name || '%')
    AND (filter_user_id IS NULL OR x_entity_memory.user_id = filter_user_id)
  ORDER BY x_entity_memory.created_at DESC;
END;
$$;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE x_entity_memory IS 'Long-term memory storage for entities (people, projects, etc.) with vector embeddings for RAG';
COMMENT ON COLUMN x_entity_memory.subject IS 'Entity name or identifier (e.g., person name, project name)';
COMMENT ON COLUMN x_entity_memory.fact IS 'The actual fact/information about the entity';
COMMENT ON COLUMN x_entity_memory.embedding IS 'Vector embedding (1536 dimensions) from OpenAI text-embedding-3-small';
COMMENT ON FUNCTION x_match_entity_memory IS 'Semantic search function for finding similar memory facts using cosine similarity';
COMMENT ON FUNCTION get_entity_facts IS 'Helper function to retrieve all facts for a specific entity';

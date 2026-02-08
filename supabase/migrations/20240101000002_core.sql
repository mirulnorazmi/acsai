-- Orchestrator Module Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create x_workflows table
CREATE TABLE IF NOT EXISTS x_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  user_id UUID NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON x_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON x_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_is_deleted ON x_workflows(is_deleted);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON x_workflows(created_at DESC);

-- Create a composite index for common queries
CREATE INDEX IF NOT EXISTS idx_workflows_user_active ON x_workflows(user_id, is_deleted, status);

-- Add Row Level Security (RLS) policies
ALTER TABLE x_workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own x_workflows
CREATE POLICY "Users can view own x_workflows"
  ON x_workflows
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own x_workflows
CREATE POLICY "Users can insert own x_workflows"
  ON x_workflows
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own x_workflows
CREATE POLICY "Users can update own x_workflows"
  ON x_workflows
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own x_workflows
CREATE POLICY "Users can delete own x_workflows"
  ON x_workflows
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON x_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE x_workflows IS 'Stores AI-generated and user-modified x_workflows';
COMMENT ON COLUMN x_workflows.id IS 'Unique identifier for the workflow';
COMMENT ON COLUMN x_workflows.name IS 'Human-readable name of the workflow';
COMMENT ON COLUMN x_workflows.description IS 'Optional description of what the workflow does';
COMMENT ON COLUMN x_workflows.steps IS 'JSON array of workflow steps with configuration';
COMMENT ON COLUMN x_workflows.version IS 'Version number, incremented on each update';
COMMENT ON COLUMN x_workflows.status IS 'Current status: draft, active, or archived';
COMMENT ON COLUMN x_workflows.user_id IS 'ID of the user who owns this workflow';
COMMENT ON COLUMN x_workflows.is_deleted IS 'Soft delete flag';
COMMENT ON COLUMN x_workflows.created_at IS 'Timestamp when the workflow was created';
COMMENT ON COLUMN x_workflows.updated_at IS 'Timestamp when the workflow was last updated';

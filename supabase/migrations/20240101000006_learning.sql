-- Learning Module Database Schema
-- Run this in your Supabase SQL Editor after running supabase_execution_migration.sql

-- ============================================
-- ADD COLUMNS TO WORKFLOWS TABLE
-- ============================================
-- Add is_gold_standard column to x_workflows to mark high-quality templates
ALTER TABLE x_workflows 
ADD COLUMN IF NOT EXISTS is_gold_standard BOOLEAN DEFAULT false;

-- Create index for faster template lookup
CREATE INDEX IF NOT EXISTS idx_workflows_is_gold_standard ON x_workflows(is_gold_standard);

-- ============================================
-- ADD COLUMNS TO EXECUTION LOGS TABLE
-- ============================================
-- Add rating and feedback columns to x_execution_logs for RLHF
ALTER TABLE x_execution_logs 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN IF NOT EXISTS feedback_comment TEXT;

-- Create index for analyzing high-rated executions
CREATE INDEX IF NOT EXISTS idx_execution_logs_rating ON x_execution_logs(rating);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN x_workflows.is_gold_standard IS 'Flag indicating if this workflow is a high-quality example (Gold Standard/Template)';
COMMENT ON COLUMN x_execution_logs.rating IS 'User rating (1-5) for RLHF (Reinforcement Learning from Human Feedback)';
COMMENT ON COLUMN x_execution_logs.feedback_comment IS 'User feedback text for improving future generations';

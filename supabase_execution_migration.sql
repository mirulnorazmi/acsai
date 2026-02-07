-- Execution Engine Database Schema
-- Run this in your Supabase SQL Editor after running supabase_migration.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- EXECUTION LOGS TABLE
-- ============================================
-- Stores the main execution records for x_workflows
CREATE TABLE IF NOT EXISTS x_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL REFERENCES x_workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_step_index INTEGER DEFAULT 0,
  current_step_id TEXT,
  input_variables JSONB DEFAULT '{}'::jsonb,
  output_result JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EXECUTION EVENTS TABLE
-- ============================================
-- Stores detailed events during execution (including self-healing events)
CREATE TABLE IF NOT EXISTS execution_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES x_execution_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('step_started', 'step_completed', 'step_failed', 'self_healing', 'retry', 'info', 'error')),
  step_id TEXT,
  step_index INTEGER,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Self-healing specific fields
  original_error TEXT,
  fix_applied TEXT,
  ai_reasoning TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP EXECUTION DETAILS TABLE
-- ============================================
-- Stores individual step execution results
CREATE TABLE IF NOT EXISTS step_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES x_execution_logs(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  tool_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'healed')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  was_healed BOOLEAN DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Execution logs indexes
CREATE INDEX IF NOT EXISTS idx_execution_logs_workflow_id ON x_execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_id ON x_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status ON x_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created_at ON x_execution_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_user_status ON x_execution_logs(user_id, status);

-- Execution events indexes
CREATE INDEX IF NOT EXISTS idx_execution_events_execution_id ON execution_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_event_type ON execution_events(event_type);
CREATE INDEX IF NOT EXISTS idx_execution_events_self_healing ON execution_events(execution_id, event_type) WHERE event_type = 'self_healing';
CREATE INDEX IF NOT EXISTS idx_execution_events_created_at ON execution_events(created_at DESC);

-- Step executions indexes
CREATE INDEX IF NOT EXISTS idx_step_executions_execution_id ON step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON step_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_executions_was_healed ON step_executions(was_healed) WHERE was_healed = true;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE x_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_executions ENABLE ROW LEVEL SECURITY;

-- Execution logs policies
CREATE POLICY "Users can view own execution logs"
  ON x_execution_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own execution logs"
  ON x_execution_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own execution logs"
  ON x_execution_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Execution events policies (read through x_execution_logs)
CREATE POLICY "Users can view execution events"
  ON execution_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM x_execution_logs
      WHERE x_execution_logs.id = execution_events.execution_id
      AND x_execution_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert execution events"
  ON execution_events
  FOR INSERT
  WITH CHECK (true); -- Allow system to insert events

-- Step executions policies (read through x_execution_logs)
CREATE POLICY "Users can view step executions"
  ON step_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM x_execution_logs
      WHERE x_execution_logs.id = step_executions.execution_id
      AND x_execution_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert step executions"
  ON step_executions
  FOR INSERT
  WITH CHECK (true); -- Allow system to insert step executions

CREATE POLICY "System can update step executions"
  ON step_executions
  FOR UPDATE
  USING (true); -- Allow system to update step executions

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at for x_execution_logs
CREATE TRIGGER update_execution_logs_updated_at
  BEFORE UPDATE ON x_execution_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE x_execution_logs IS 'Main execution records for workflow runs';
COMMENT ON TABLE execution_events IS 'Detailed event log including self-healing events';
COMMENT ON TABLE step_executions IS 'Individual step execution results';

COMMENT ON COLUMN x_execution_logs.status IS 'Current execution status: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN execution_events.event_type IS 'Type of event: step_started, step_completed, step_failed, self_healing, retry, info, error';
COMMENT ON COLUMN execution_events.ai_reasoning IS 'AI explanation for self-healing fixes';
COMMENT ON COLUMN step_executions.was_healed IS 'Flag indicating if this step was auto-fixed by AI';

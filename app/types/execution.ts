/**
 * Execution Engine Type Definitions
 * Types for workflow execution, monitoring, and self-healing
 */

/**
 * Execution Status
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Step Execution Status
 */
export type StepExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'healed';

/**
 * Event Types
 */
export type ExecutionEventType = 
  | 'step_started' 
  | 'step_completed' 
  | 'step_failed' 
  | 'self_healing' 
  | 'retry' 
  | 'info' 
  | 'error';

/**
 * Execution Log
 * Main execution record
 */
export interface ExecutionLog {
  id: string;
  workflow_id: string;
  user_id: string;
  status: ExecutionStatus;
  current_step_index: number;
  current_step_id?: string;
  input_variables: Record<string, any>;
  output_result?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Execution Event
 * Detailed event log entry
 */
export interface ExecutionEvent {
  id: string;
  execution_id: string;
  event_type: ExecutionEventType;
  step_id?: string;
  step_index?: number;
  message: string;
  metadata?: Record<string, any>;
  // Self-healing specific
  original_error?: string;
  fix_applied?: string;
  ai_reasoning?: string;
  retry_count?: number;
  created_at: string;
}

/**
 * Step Execution
 * Individual step execution record
 */
export interface StepExecution {
  id: string;
  execution_id: string;
  step_id: string;
  step_index: number;
  step_type: string;
  tool_name?: string;
  status: StepExecutionStatus;
  input_data?: Record<string, any>;
  output_data?: any;
  error_message?: string;
  retry_count: number;
  was_healed: boolean;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

/**
 * API Request/Response Types
 */

// POST /api/execute/[id]
export interface ExecuteWorkflowRequest {
  input_variables?: Record<string, any>;
}

export interface ExecuteWorkflowResponse {
  execution_id: string;
  status: 'running';
}

// GET /api/execute/[id]/status
export interface ExecutionStatusResponse {
  execution_id: string;
  status: ExecutionStatus;
  current_step?: string;
  current_step_index: number;
  total_steps: number;
  logs: string[];
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

// GET /api/execute/[id]/healing-events
export interface HealingEvent {
  step: string;
  step_index: number;
  error: string;
  fix_applied: string;
  ai_reasoning: string;
  timestamp: string;
}

export interface HealingEventsResponse {
  execution_id: string;
  events: HealingEvent[];
}

/**
 * Self-Healing Context
 * Information passed to AI for fixing errors
 */
export interface SelfHealingContext {
  step_id: string;
  step_config: Record<string, any>;
  error_message: string;
  error_details?: any;
  workflow_context: Record<string, any>;
  previous_outputs: Record<string, any>;
}

/**
 * Self-Healing Result
 * AI's proposed fix
 */
export interface SelfHealingResult {
  fixed_config: Record<string, any>;
  reasoning: string;
  confidence: number;
}

/**
 * Tool Executor Interface
 * Base interface for tool execution
 */
export interface ToolExecutor {
  name: string;
  execute(config: Record<string, any>, context: Record<string, any>): Promise<any>;
}

/**
 * Execution Context
 * Runtime context passed through execution
 */
export interface ExecutionContext {
  execution_id: string;
  workflow_id: string;
  user_id: string;
  input_variables: Record<string, any>;
  step_outputs: Record<string, any>;
  current_step_index: number;
}

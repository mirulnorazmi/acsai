/**
 * Orchestrator Module Type Definitions
 * Shared types for workflow management across the application
 */

/**
 * Workflow Step Types
 */
export type WorkflowStepType = 'action' | 'condition' | 'trigger' | 'end';

/**
 * Workflow Status
 */
export type WorkflowStatus = 'draft' | 'active' | 'archived';

/**
 * Position for React Flow nodes
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Workflow Step
 * Represents a single step in a workflow
 */
export interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  tool?: string;
  config?: Record<string, any>;
  position?: Position;
  next?: string;
}

/**
 * Workflow
 * Complete workflow object from database
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  version: number;
  status: WorkflowStatus;
  user_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * API Request/Response Types
 */

// POST /api/orchestrator/generate
export interface GenerateWorkflowRequest {
  prompt: string;
  context_override?: string;
}

export interface GenerateWorkflowResponse {
  workflow_id: string;
  name: string;
  steps: WorkflowStep[];
}

// GET /api/orchestrator/[id]
export interface GetWorkflowResponse {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  version: number;
  status: WorkflowStatus;
  created_at: string;
  updated_at: string;
}

// PUT /api/orchestrator/[id]
export interface UpdateWorkflowRequest {
  steps: WorkflowStep[];
}

export interface UpdateWorkflowResponse {
  status: 'updated';
  version: number;
  workflow: {
    id: string;
    steps: WorkflowStep[];
    updated_at: string;
  };
}

// POST /api/orchestrator/[id]/modify
export interface ModifyWorkflowRequest {
  instruction: string;
  current_version: number;
}

export interface ModifyWorkflowResponse {
  workflow_id: string;
  version: number;
  diff: string;
  steps: WorkflowStep[];
  name: string;
  description?: string;
}

// DELETE /api/orchestrator/[id]
export interface DeleteWorkflowResponse {
  status: 'deleted';
  id: string;
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * Available Tools
 * List of tools that can be used in workflows
 */
export const AVAILABLE_TOOLS = [
  'slack_invite',
  'email_send',
  'http_request',
  'database_query',
  'file_upload',
  'webhook_trigger',
  'data_transform',
  'conditional_branch',
  'loop_iterator',
  'delay_timer',
] as const;

export type AvailableTool = typeof AVAILABLE_TOOLS[number];

/**
 * Tool Configuration Types
 * Specific configurations for different tool types
 */
export interface SlackInviteConfig {
  channel: string;
  message?: string;
}

export interface EmailSendConfig {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

export interface DelayTimerConfig {
  duration: number; // in milliseconds
  unit?: 'ms' | 's' | 'm' | 'h';
}

export interface ConditionalBranchConfig {
  condition: string;
  trueNext?: string;
  falseNext?: string;
}

/**
 * Type guard to check if a tool is valid
 */
export function isValidTool(tool: string): tool is AvailableTool {
  return AVAILABLE_TOOLS.includes(tool as AvailableTool);
}

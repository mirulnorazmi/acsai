import { z } from 'zod';

/**
 * Execution Engine Validation Schemas
 */

/**
 * POST /api/execute/[id]
 */
export const ExecuteWorkflowSchema = z.object({
  input_variables: z.record(z.any()).optional().default({}),
});

export type ExecuteWorkflowInput = z.infer<typeof ExecuteWorkflowSchema>;

/**
 * Execution Status Enum
 */
export const ExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
]);

/**
 * Event Type Enum
 */
export const ExecutionEventTypeSchema = z.enum([
  'step_started',
  'step_completed',
  'step_failed',
  'self_healing',
  'retry',
  'info',
  'error',
]);

/**
 * Step Execution Status Enum
 */
export const StepExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'healed',
]);

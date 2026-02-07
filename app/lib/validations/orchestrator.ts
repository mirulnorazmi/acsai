import { z } from 'zod';

/**
 * Workflow Step Schema
 */
export const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(['action', 'condition', 'trigger', 'end']),
  tool: z.string().optional(),
  config: z.record(z.any()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  next: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

/**
 * POST /api/orchestrator/generate
 */
export const GenerateWorkflowSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context_override: z.string().optional(),
});

export type GenerateWorkflowInput = z.infer<typeof GenerateWorkflowSchema>;

/**
 * POST /api/orchestrator/[id]/modify
 */
export const ModifyWorkflowSchema = z.object({
  instruction: z.string().min(1, 'Instruction is required'),
  current_version: z.number().int().positive(),
});

export type ModifyWorkflowInput = z.infer<typeof ModifyWorkflowSchema>;

/**
 * PUT /api/orchestrator/[id]
 */
export const UpdateWorkflowSchema = z.object({
  steps: z.array(WorkflowStepSchema),
});

export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;

/**
 * Database Workflow Schema
 */
export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(WorkflowStepSchema),
  version: z.number().int().default(1),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  user_id: z.string().uuid(),
  is_deleted: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Workflow = z.infer<typeof WorkflowSchema>;

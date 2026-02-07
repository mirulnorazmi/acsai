import { z } from 'zod';

/**
 * Learning Module Validation Schemas
 */

export const PlatformSchema = z.enum(['n8n', 'zapier']);

/**
 * POST /api/export/[id] - Export Workflow
 */
export const ExportWorkflowSchema = z.object({
  target_platform: PlatformSchema,
});

export type ExportWorkflowInput = z.infer<typeof ExportWorkflowSchema>;

/**
 * POST /api/learning/feedback - Record Feedback
 */
export const RecordFeedbackSchema = z.object({
  execution_id: z.string().uuid('Invalid Execution ID'),
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment too long').optional(),
});

export type RecordFeedbackInput = z.infer<typeof RecordFeedbackSchema>;

/**
 * GET /api/learning/templates - Get Templates Query Params
 */
export const GetTemplatesSchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type GetTemplatesInput = z.infer<typeof GetTemplatesSchema>;

import { z } from 'zod';

/**
 * Discovery Module Validation Schemas
 */

/**
 * POST /api/discovery/tools - Register Tool
 */
export const RegisterToolSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  platform: z.string().min(1, 'Platform is required').max(50),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  schema: z.record(z.any()).refine(
    (schema) => {
      // Basic JSON Schema validation
      return schema && typeof schema === 'object';
    },
    { message: 'Schema must be a valid JSON object' }
  ),
});

export type RegisterToolInput = z.infer<typeof RegisterToolSchema>;

/**
 * GET /api/discovery/search - Search Query Params
 */
export const SearchToolsSchema = z.object({
  q: z.string().min(1, 'Query is required'),
  limit: z.coerce.number().int().min(1).max(20).optional().default(5),
  threshold: z.coerce.number().min(0).max(1).optional().default(0.5),
});

export type SearchToolsInput = z.infer<typeof SearchToolsSchema>;

/**
 * Tool Platform Enum
 */
export const ToolPlatformSchema = z.enum([
  'slack',
  'email',
  'http',
  'database',
  'webhook',
  'file',
  'calendar',
  'crm',
  'analytics',
  'other',
]);

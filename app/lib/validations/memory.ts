import { z } from 'zod';

/**
 * Memory Module Validation Schemas
 */

/**
 * POST /api/memory/facts - Store Fact
 */
export const StoreFactSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  fact: z.string().min(5, 'Fact must be at least 5 characters').max(1000),
});

export type StoreFactInput = z.infer<typeof StoreFactSchema>;

/**
 * GET /api/memory/context - Get Context Query Params
 */
export const GetContextSchema = z.object({
  entity: z.string().min(1, 'Entity is required'),
});

export type GetContextInput = z.infer<typeof GetContextSchema>;

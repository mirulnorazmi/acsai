import { z } from 'zod';

/**
 * Auth Module Validation Schemas
 */

/**
 * POST /api/auth/register
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * POST /api/auth/login
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * POST /api/auth/keys
 */
export const StoreKeySchema = z.object({
  platform: z.string().toLowerCase().min(1, 'Platform is required'), // e.g. 'slack'
  api_key: z.string().min(1, 'API Key is required'),
  api_secret: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type StoreKeyInput = z.infer<typeof StoreKeySchema>;

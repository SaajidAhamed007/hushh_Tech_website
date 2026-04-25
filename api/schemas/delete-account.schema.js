import { z } from 'zod';

/**
 * Delete Account Request Schema
 * Authorization header is required for account deletion
 * No body required - auth is in headers
 */
export const deleteAccountSchema = z.object({}).strict();

/**
 * Delete Account Response Schema
 */
export const deleteAccountResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  details: z.string().optional(),
  code: z.string().optional(),
  // Success response
  deletedScopes: z.array(z.string()).optional(),
  retainedScopes: z.array(z.string()).optional(),
}).strict();

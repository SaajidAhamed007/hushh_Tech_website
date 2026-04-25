import { z } from 'zod';

/**
 * Google Wallet Pass Request Schema
 * Flexible payload validation supporting string or object formats
 */
export const googleWalletPassSchema = z.object({
  payload: z.union([
    z.string().describe('JSON string of wallet pass payload'),
    z.record(z.any()).describe('Wallet pass payload object'),
  ]).optional(),
  passType: z.string().optional().describe('Type of wallet pass'),
  description: z.string().optional().describe('Pass description for validation'),
}).passthrough(); // Allow passthrough for flex payload

/**
 * Google Wallet Pass Response Schema
 */
export const googleWalletPassResponseSchema = z.object({
  saveUrl: z.string().url().optional().describe('URL to save pass to Google Wallet'),
  provider: z.enum(['local', 'upstream']).describe('Provider used'),
  available: z.boolean().optional().describe('Whether service is available'),
  message: z.string().optional().describe('Status message'),
}).passthrough();

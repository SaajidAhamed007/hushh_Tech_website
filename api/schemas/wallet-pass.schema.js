import { z } from 'zod';

/**
 * Wallet Pass Request Schema
 * Validates incoming request body for Apple Wallet pass creation
 * 
 * Supports flexible payload format:
 * - Direct object: { field1: value1, ... }
 * - String payload: { payload: "{...}" }
 */
export const walletPassSchema = z.object({
  payload: z.union([
    z.string().describe('JSON string of pass payload'),
    z.record(z.any()).describe('Pass payload object'),
  ]).optional(),
}).passthrough(); // Allow any other fields as pass data

/**
 * Wallet Pass Response Schema
 * Binary pkpass file with metadata headers
 */
export const walletPassResponseSchema = z.object({
  buffer: z.instanceof(Buffer),
  contentType: z.string().default('application/vnd.apple.pkpass'),
  contentDisposition: z.string().optional(),
  passSerial: z.string().optional(),
  passType: z.string().optional(),
});

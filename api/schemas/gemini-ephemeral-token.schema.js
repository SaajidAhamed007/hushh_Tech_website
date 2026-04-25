import { z } from 'zod';

/**
 * Gemini Ephemeral Token Request Schema
 * Validates incoming request body for token generation
 */
export const geminiTokenSchema = z.object({
  language: z.string().default('en-US').describe('Language code for the token'),
}).strict();

/**
 * Gemini Ephemeral Token Response Schema
 * Validates the response data structure
 */
export const geminiTokenResponseSchema = z.object({
  success: z.boolean(),
  wsUrl: z.string().url().describe('WebSocket URL for Gemini Live API connection'),
  language: z.string(),
  model: z.string(),
  expiresIn: z.number().describe('Token expiration time in seconds'),
}).strict();

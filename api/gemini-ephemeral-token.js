/**
 * Gemini Live API - Ephemeral Token Generator
 * Creates secure short-lived tokens for client-side WebSocket connections
 * 
 * Endpoint: POST /api/gemini-ephemeral-token
 * 
 * Required for secure client-to-server Gemini Live API connections
 * @see https://ai.google.dev/gemini-api/docs/ephemeral-tokens
 */

import { createHandler } from './_core/createHandler.js';
import { geminiTokenSchema } from './schemas/gemini-ephemeral-token.schema.js';

// Rotate through multiple API keys
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean);

let keyIndex = 0;

function getNextKey() {
  if (API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }
  const key = API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % API_KEYS.length;
  return key;
}

export default createHandler({
  schema: geminiTokenSchema,
  timeout: 5000,
  handler: async ({ body, res }) => {
    const { language } = body;
    
    const apiKey = getNextKey();
    
    // Generate ephemeral token from Google
    // This requests a short-lived token from Google's API
    // Never expose the master API key to the client
    
    try {
      const tokenResponse = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/ephemeral-tokens',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: 'models/gemini-2.0-flash',
            expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          }),
        }
      );

      if (!tokenResponse.ok) {
        const error = new Error('Failed to generate ephemeral token');
        error.statusCode = tokenResponse.status;
        throw error;
      }

      const { token } = await tokenResponse.json();

      // Return only the ephemeral token, never the master key
      // Client uses this token for WebSocket connection
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?token=${token}`;
      
      return {
        token,
        wsUrl,
        expiresIn: 3600, // 1 hour in seconds
        language,
      };
    } catch (error) {
      // Let createHandler's error handler process this
      throw error;
    }
  },
});

export const config = {
  api: {
    bodyParser: true,
  },
};

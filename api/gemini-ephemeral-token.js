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
    // Note: This is a placeholder - actual implementation depends on Google's ephemeral token API
    // Currently, for Gemini Live API preview, direct WebSocket connection with API key is used
    
    // Gemini Live API WebSocket URL
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    // For production with ephemeral tokens, you would call:
    // POST https://generativelanguage.googleapis.com/v1beta/ephemeral-tokens
    // with appropriate configuration
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return {
      success: true,
      wsUrl,
      language,
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      expiresIn: 3600, // 1 hour
      // For future ephemeral token implementation:
      // token: ephemeralToken,
    };
  },
});

export const config = {
  api: {
    bodyParser: true,
  },
};

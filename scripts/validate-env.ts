/**
 * Environment Validation Script
 * 
 * This script validates that all required environment variables are present
 * and properly formatted before the application starts.
 * 
 * Usage:
 *   npx ts-node scripts/validate-env.ts
 * 
 * Integrates with:
 *   - npm run dev (development)
 *   - npm run build (production build)
 *   - npm run dev:api (API server)
 */

import { z } from 'zod';

// Define environment variable schema with Zod
const envSchema = z.object({
  // Supabase Configuration (Required for Backend)
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL')
    .optional(),
  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY cannot be empty')
    .optional(),

  // Frontend Environment Variables (Vite - exposed to client)
  VITE_SUPABASE_URL: z
    .string()
    .url('VITE_SUPABASE_URL must be a valid URL')
    .optional(),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY cannot be empty')
    .optional(),
  VITE_SUPABASE_REDIRECT_URL: z
    .string()
    .url('VITE_SUPABASE_REDIRECT_URL must be a valid URL')
    .optional(),

  // KYC Configuration
  VITE_KYC_ENV: z
    .enum(['development', 'staging', 'production'])
    .optional()
    .default('development'),
  VITE_KYC_DEMO_MODE: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
  VITE_KYC_API_BASE: z
    .string()
    .url('VITE_KYC_API_BASE must be a valid URL')
    .optional(),

  // API Keys (Client-side - browser visible)
  VITE_FINNHUB_API_KEY: z
    .string()
    .min(1, 'VITE_FINNHUB_API_KEY cannot be empty')
    .optional(),
  VITE_GEMINI_API_KEY: z
    .string()
    .min(1, 'VITE_GEMINI_API_KEY cannot be empty')
    .optional(),
  VITE_GEMINI_API_KEY_FALLBACK_1: z
    .string()
    .min(1)
    .optional(),
  VITE_GEMINI_API_KEY_FALLBACK_2: z
    .string()
    .min(1)
    .optional(),
  VITE_GEMINI_API_KEY_FALLBACK_3: z
    .string()
    .min(1)
    .optional(),
  VITE_OPENAI_API_KEY: z
    .string()
    .min(1, 'VITE_OPENAI_API_KEY cannot be empty')
    .optional(),

  // Firebase Configuration
  VITE_FIREBASE_API_KEY: z
    .string()
    .min(1)
    .optional(),
  VITE_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1)
    .optional(),
  VITE_FIREBASE_PROJECT_ID: z
    .string()
    .min(1)
    .optional(),
  VITE_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1)
    .optional(),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1)
    .optional(),
  VITE_FIREBASE_APP_ID: z
    .string()
    .min(1)
    .optional(),

  // External Service URLs
  VITE_N8N_WEBHOOK_URL: z
    .string()
    .url('VITE_N8N_WEBHOOK_URL must be a valid URL')
    .optional(),
  VITE_VOICE_AGENT_URL: z
    .string()
    .url('VITE_VOICE_AGENT_URL must be a valid URL')
    .optional(),

  // Optional Client Configuration
  VITE_GUEST_MODE_ACCESS_TOKEN: z.string().optional(),
  VITE_MARKET_SUPABASE_URL: z
    .string()
    .url('VITE_MARKET_SUPABASE_URL must be a valid URL')
    .optional(),
  VITE_MARKET_SUPABASE_KEY: z
    .string()
    .min(1)
    .optional(),
  VITE_KYC_TEST_BANK_IDS: z.string().optional(),
  VITE_ALLOW_INSECURE_BROWSER_LLM: z
    .string()
    .transform((v) => v === 'true')
    .optional()
    .default('false'),

  // Server Configuration
  PORT: z
    .string()
    .transform(Number)
    .optional()
    .default('5173'),
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .optional()
    .default('development'),
});

type Environment = z.infer<typeof envSchema>;

/**
 * Validates environment variables and provides helpful error messages
 */
function validateEnvironment(): Environment {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    
    console.error('\n❌ Environment Validation Failed\n');
    console.error('Invalid environment variables:\n');
    
    Object.entries(errors).forEach(([field, messages]) => {
      if (messages && messages.length > 0) {
        console.error(`  ${field}:`);
        messages.forEach((message) => {
          console.error(`    • ${message}`);
        });
      }
    });

    console.error('\n📋 To fix this:\n');
    console.error('  1. Copy .env.local.example to .env.local');
    console.error('  2. Fill in the required values');
    console.error('  3. Ensure URLs are properly formatted');
    console.error('\n');

    process.exit(1);
  }

  return result.data;
}

/**
 * Logs validation summary
 */
function logValidationSummary(env: Environment): void {
  const isDev = env.NODE_ENV === 'development';
  const icon = isDev ? '✨' : '✅';

  console.log(`\n${icon} Environment Validation Passed\n`);
  
  if (isDev) {
    console.log('Environment Summary:');
    console.log(`  Node Environment: ${env.NODE_ENV}`);
    console.log(`  KYC Environment: ${env.VITE_KYC_ENV}`);
    console.log(`  KYC Demo Mode: ${env.VITE_KYC_DEMO_MODE}`);
    console.log(`  Port: ${env.PORT}`);
    
    // Check which critical configs are present
    const configStatus = {
      'Supabase': !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
      'Firebase': !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID),
      'Gemini API': !!env.VITE_GEMINI_API_KEY,
      'OpenAI API': !!env.VITE_OPENAI_API_KEY,
      'Finnhub API': !!env.VITE_FINNHUB_API_KEY,
    };

    console.log('\nService Status:');
    Object.entries(configStatus).forEach(([service, configured]) => {
      const status = configured ? '✓' : '⊘';
      console.log(`  ${status} ${service}`);
    });
    
    console.log('');
  }
}

/**
 * Main validation function
 */
export function validate(): Environment {
  try {
    const env = validateEnvironment();
    logValidationSummary(env);
    return env;
  } catch (error) {
    console.error('Fatal error during environment validation:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validate();
}

export default validate;

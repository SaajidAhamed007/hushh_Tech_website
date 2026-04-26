/**
 * Environment Validation Script
 * 
 * This script validates that all required environment variables are present
 * and properly formatted before the application starts.
 * 
 * SECURITY NOTE: API keys should NOT be prefixed with VITE_ because that exposes
 * them to the browser bundle. Server-only keys should use process.env without the prefix.
 * 
 * Usage:
 *   node scripts/validate-env.js
 * 
 * Integrates with:
 *   - npm run dev (development)
 *   - npm run build (production build)
 *   - npm run dev:api (API server)
 */

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

// Server-only variables (NOT exposed to browser)
const serverOnlyEnvVars = [
  'GEMINI_API_KEY',     // NOT VITE_ prefixed - server only
  'OPENAI_API_KEY',     // NOT VITE_ prefixed - server only
  'FINNHUB_API_KEY',    // NOT VITE_ prefixed - server only
];

const optionalEnvVars = [
  'VITE_KYC_ENV',
  'VITE_FIREBASE_API_KEY',
  'PORT',
  'NODE_ENV',
];

function validateEnv() {
  const allRequired = [...requiredEnvVars, ...serverOnlyEnvVars];
  const missing = allRequired.filter(
    (key) => !process.env[key] || process.env[key].trim() === ''
  );

  const invalid = [];

  // Validate URLs
  const urlVars = ['VITE_SUPABASE_URL', 'VITE_KYC_API_BASE', 'VITE_N8N_WEBHOOK_URL'];
  urlVars.forEach((key) => {
    if (process.env[key]) {
      try {
        new URL(process.env[key]);
      } catch {
        invalid.push(`${key} is not a valid URL`);
      }
    }
  });

  if (missing.length > 0 || invalid.length > 0) {
    console.error('\n❌ Environment Validation Failed\n');

    if (missing.length > 0) {
      console.error('Missing required environment variables:');
      missing.forEach((key) => console.error(`  • ${key}`));
    }

    if (invalid.length > 0) {
      console.error('\nInvalid environment variables:');
      invalid.forEach((msg) => console.error(`  • ${msg}`));
    }

    console.error('\n📋 To fix this:\n');
    console.error('  1. Copy .env.local.example to .env.local');
    console.error('  2. Fill in the required values');
    console.error('  3. Ensure URLs are properly formatted\n');

    process.exit(1);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDev = nodeEnv === 'development';
  const icon = isDev ? '✨' : '✅';

  console.log(`\n${icon} Environment Validation Passed\n`);

  if (isDev) {
    console.log('Environment Summary:');
    console.log(`  Node Environment: ${nodeEnv}`);
    console.log(`  KYC Environment: ${process.env.VITE_KYC_ENV || 'development'}`);
    console.log(`  Port: ${process.env.PORT || '5173'}`);

    const configStatus = {
      'Supabase': !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      'Gemini API (server-only)': !!process.env.GEMINI_API_KEY,
      'OpenAI API (server-only)': !!process.env.OPENAI_API_KEY,
      'Finnhub API (server-only)': !!process.env.FINNHUB_API_KEY,
      'Firebase': !!process.env.VITE_FIREBASE_API_KEY,
    };

    console.log('\nService Status:');
    Object.entries(configStatus).forEach(([service, configured]) => {
      const status = configured ? '✓' : '⊘';
      console.log(`  ${status} ${service}`);
    });

    console.log('');
  }
}

validateEnv();

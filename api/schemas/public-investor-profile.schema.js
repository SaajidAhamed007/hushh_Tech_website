import { z } from 'zod';

/**
 * Public Investor Profile Request Schema
 * Query parameter validation for slug-based profile lookup
 */
export const publicInvestorProfileSchema = z.object({
  slug: z.string().min(1).describe('Public profile slug identifier'),
}).strict();

/**
 * Public Investor Profile Response Schema
 * Validates the response structure with privacy-aware fields
 */
export const publicInvestorProfileResponseSchema = z.object({
  slug: z.string(),
  profile_url: z.string().url(),
  is_confirmed: z.boolean(),
  basic_info: z.object({
    name: z.string(),
    email: z.string().email().nullable(),
    age: z.number().nullable(),
    organisation: z.string().nullable(),
  }),
  investor_profile: z.record(z.any()).nullable(),
  onboarding_data: z.object({
    account_type: z.string().nullable(),
    selected_fund: z.string().nullable(),
    citizenship_country: z.string().nullable(),
    residence_country: z.string().nullable(),
  }).nullable(),
  shadow_profile: z.record(z.any()).nullable(),
}).strict();

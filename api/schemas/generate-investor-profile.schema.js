import { z } from 'zod';

/**
 * Generate Investor Profile Request Schema
 * Validates input and context for AI-powered profile generation
 */
export const generateInvestorProfileSchema = z.object({
  input: z.object({
    name: z.string().min(1).describe('User name'),
    email: z.string().email().describe('User email'),
    age: z.number().int().min(0).max(150).describe('User age'),
    phone_country_code: z.string().min(1).describe('Phone country code'),
    phone_number: z.string().min(1).describe('Phone number'),
    organisation: z.string().optional().describe('Organization name'),
  }).strict(),
  context: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    currency: z.string().optional(),
    email_type: z.string().optional(),
    company_industry: z.string().optional(),
    life_stage: z.string().optional(),
    org_type: z.string().optional(),
    financial_context: z.object({
      nws_score: z.number().min(0).max(100).optional(),
      nws_tier: z.string().optional(),
      total_cash_balance: z.number().optional(),
      total_investment_value: z.number().optional(),
      num_accounts: z.number().optional(),
      account_types: z.array(z.string()).optional(),
      address: z.string().optional(),
      identity_verification_score: z.number().optional(),
    }).optional(),
  }).strict(),
}).strict();

/**
 * Investor Profile Field Schema
 * Single field with value, confidence, and rationale
 */
const investorProfileFieldSchema = z.object({
  value: z.union([
    z.string(),
    z.array(z.string()),
  ]).describe('Selected option value(s)'),
  confidence: z.number().min(0).max(1).describe('Confidence score 0.0-1.0'),
  rationale: z.string().describe('Reasoning for selection'),
}).strict();

/**
 * Generate Investor Profile Response Schema
 */
export const generateInvestorProfileResponseSchema = z.object({
  success: z.boolean(),
  profile: z.object({
    primary_goal: investorProfileFieldSchema,
    investment_horizon_years: investorProfileFieldSchema,
    risk_tolerance: investorProfileFieldSchema,
    liquidity_need: investorProfileFieldSchema,
    experience_level: investorProfileFieldSchema,
    typical_ticket_size: investorProfileFieldSchema,
    annual_investing_capacity: investorProfileFieldSchema,
    asset_class_preference: investorProfileFieldSchema,
    sector_preferences: investorProfileFieldSchema,
    volatility_reaction: investorProfileFieldSchema,
    sustainability_preference: investorProfileFieldSchema,
    engagement_style: investorProfileFieldSchema,
  }).strict(),
});

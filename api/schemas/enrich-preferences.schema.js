import { z } from 'zod';

/**
 * Enrich Preferences Request Schema
 * Validates user profile data for preference enrichment
 */
export const enrichPreferencesSchema = z.object({
  name: z.string().min(1).describe('User name'),
  email: z.string().email().describe('User email'),
  age: z.number().int().min(0).max(150).describe('User age'),
  phone_country_code: z.string().min(1).describe('Phone country code'),
  phone_number: z.string().min(1).describe('Phone number'),
  organisation: z.string().optional().describe('Organization name'),
}).strict();

/**
 * Nested preference schema builders for validation
 */
const budgetSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  min: z.number().min(0),
  max: z.number().min(0),
}).strict();

const foodSchema = z.object({
  dietType: z.enum(['veg', 'non_veg', 'vegan', 'mixed', 'unknown']),
  spiceLevel: z.enum(['low', 'medium', 'high', 'unknown']),
  favoriteCuisines: z.array(z.string()).min(1),
  budgetLevel: z.enum(['low', 'mid', 'high', 'unknown']),
  eatingOutFrequency: z.enum(['rarely', 'weekly', 'few_times_week', 'daily', 'unknown']),
}).strict();

const drinkSchema = z.object({
  alcoholPreference: z.enum(['never', 'occasionally', 'frequently', 'unknown']),
  favoriteAlcoholTypes: z.array(z.string()).min(1),
  favoriteNonAlcoholicTypes: z.array(z.string()).min(1),
  sugarLevel: z.enum(['low', 'medium', 'high', 'unknown']),
  caffeineTolerance: z.enum(['none', 'low', 'medium', 'high', 'unknown']),
}).strict();

const hotelSchema = z.object({
  budgetPerNight: budgetSchema,
  hotelClass: z.enum(['hostel', 'budget', '3_star', '4_star', '5_star', 'unknown']),
  locationPreference: z.enum(['city_center', 'suburbs', 'near_airport', 'scenic', 'unknown']),
  roomType: z.enum(['single', 'double', 'dorm', 'suite', 'unknown']),
  amenitiesPriority: z.array(z.string()).min(1),
}).strict();

const coffeeSchema = z.object({
  coffeeConsumerType: z.enum(['none', 'occasional', 'daily', 'heavy', 'unknown']),
  coffeeStyle: z.array(z.string()).min(1),
  milkPreference: z.enum(['dairy', 'oat', 'soy', 'almond', 'none', 'unknown']),
  sweetnessLevel: z.enum(['no_sugar', 'low', 'medium', 'high', 'unknown']),
  cafeAmbiencePreference: z.enum(['quiet_work', 'casual', 'social_loud', 'no_preference']),
}).strict();

const brandSchema = z.object({
  fashionStyle: z.enum(['streetwear', 'minimal', 'formal', 'sporty', 'mixed', 'unknown']),
  techEcosystem: z.enum(['apple', 'android', 'windows', 'mixed', 'unknown']),
  shoppingChannels: z.array(z.string()).min(1),
  priceSensitivity: z.enum(['very_price_sensitive', 'value_for_money', 'mid_range', 'premium', 'unknown']),
  brandValues: z.array(z.string()).min(1),
}).strict();

/**
 * Enriched Preferences Response Schema
 */
export const enrichPreferencesResponseSchema = z.object({
  preferences: z.object({
    food: foodSchema,
    drink: drinkSchema,
    hotel: hotelSchema,
    coffee: coffeeSchema,
    brand: brandSchema,
    lastEnrichedAt: z.string().datetime(),
  }).strict(),
});

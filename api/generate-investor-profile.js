/**
 * Serverless function to generate investor profile using OpenAI GPT-4o API
 * This runs server-side to avoid CORS issues and keep API keys secure
 */
import { createHandler } from "./_core/createHandler.js";
import { generateInvestorProfileSchema } from "./schemas/generate-investor-profile.schema.js";

const SYSTEM_PROMPT = `You are an assistant that PRE-FILLS an INVESTOR PROFILE from minimal information.

You are given:
- raw user inputs: name, phone (with country code), email, age, organisation
- derived_context: country, region, currency, email_type, company_industry, life_stage, org_type
- financial_context (optional, from verified bank data via Plaid): nws_score (0-100), nws_tier, total_cash_balance, total_investment_value, num_accounts, account_types, address, identity_verification_score

GOALS:
1. For each of 12 profile fields, GUESS a reasonable default value based on general demographic and behavioral patterns of investors.
2. For each field, return:
   - value: the selected option (must match exactly from allowed values)
   - confidence: 0.0–1.0 (how confident you are in this guess)
   - rationale: 1-2 sentences explaining your reasoning

3. Be conservative and privacy-first:
   - Never claim to know actual income, net worth, or legal accreditation
   - Use only the provided context and typical statistical patterns
   - Younger investors (20s-30s) often have longer time horizons (>10 years)
   - Tech/finance roles often correlate with higher risk tolerance (moderate to high)
   - Life stage influences liquidity needs and investment capacity
   - Early career = lower capacity, mid/late career = higher capacity

4. If financial_context is provided (verified bank data), use it to SIGNIFICANTLY improve accuracy:
   - NWS score 80+ (Elite) → higher risk tolerance, larger ticket sizes, advanced experience
   - NWS score 60-79 (Strong) → moderate-high risk, medium-large tickets
   - NWS score 40-59 (Moderate) → moderate risk, small-medium tickets
   - NWS score <40 (Building) → conservative, micro-small tickets
   - Use total_cash_balance + total_investment_value to calibrate annual_investing_capacity
   - Account types (401k, brokerage, etc.) indicate experience level
   - Set confidence 0.7-0.9 for fields informed by real financial data

5. If you have no clear signal, choose the SAFEST neutral option and set confidence <= 0.3.

5. For multi-select fields (asset_class_preference, sector_preferences), return 2-4 relevant items.

OUTPUT REQUIREMENTS:
- Must be valid JSON only, no comments, no extra text
- Use option values EXACTLY as specified in the schema
- All 12 fields must be present
- Each field must have: value, confidence, rationale
- Confidence must be between 0.0 and 1.0
- Return the profile under key "investor_profile"`;

const PROFILE_SCHEMA = {
  primary_goal: {
    options: ["capital_preservation", "steady_income", "long_term_growth", "aggressive_growth", "speculation"],
    description: "Main investment objective"
  },
  investment_horizon_years: {
    options: ["<3_years", "3_5_years", "5_10_years", ">10_years"],
    description: "Expected investment timeframe"
  },
  risk_tolerance: {
    options: ["very_low", "low", "moderate", "high", "very_high"],
    description: "Comfort level with portfolio volatility"
  },
  liquidity_need: {
    options: ["low", "medium", "high"],
    description: "Need for quick access to invested money"
  },
  experience_level: {
    options: ["beginner", "intermediate", "advanced"],
    description: "Investing knowledge and experience"
  },
  typical_ticket_size: {
    options: ["micro_<1k", "small_1k_10k", "medium_10k_50k", "large_>50k"],
    description: "Typical amount per investment (adjust for currency)"
  },
  annual_investing_capacity: {
    options: ["<5k", "5k_20k", "20k_100k", ">100k"],
    description: "Annual new investment capacity (adjust for currency)"
  },
  asset_class_preference: {
    options: ["public_equities", "mutual_funds_etfs", "fixed_income", "real_estate", "startups_private_equity", "crypto_digital_assets", "cash_equivalents"],
    description: "Preferred asset classes (multi-select, 2-4 items)",
    type: "array"
  },
  sector_preferences: {
    options: ["technology", "consumer_internet", "fintech", "healthcare", "real_estate", "energy_climate", "industrial", "other"],
    description: "Preferred investment sectors (multi-select, 2-4 items)",
    type: "array"
  },
  volatility_reaction: {
    options: ["sell_to_avoid_more_loss", "hold_and_wait", "buy_more_at_lower_prices"],
    description: "Behavior during 20% portfolio decline"
  },
  sustainability_preference: {
    options: ["not_important", "nice_to_have", "important", "very_important"],
    description: "Importance of ESG/sustainability factors"
  },
  engagement_style: {
    options: ["very_passive_just_updates", "collaborative_discuss_key_decisions", "hands_on_active_trader"],
    description: "Desired level of involvement in investment decisions"
  }
};

export default createHandler({
  schema: generateInvestorProfileSchema,
  timeout: 30000, // GPT-4o can take time
  handler: async ({ body }) => {
    const { input, context } = body;

    // Get OpenAI API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      const error = new Error('OpenAI API key not configured on server');
      error.statusCode = 500;
      throw error;
    }

    // Separate financial_context from derived_context if present
    const { financial_context, ...derivedContext } = context;

    // Prepare prompt for GPT-4o — include financial_context if available
    const promptPayload = {
      raw_input: {
        name: input.name,
        email: input.email,
        age: input.age,
        phone_country_code: input.phone_country_code,
        phone_number: input.phone_number,
        organisation: input.organisation || null
      },
      derived_context: derivedContext,
      profile_schema: PROFILE_SCHEMA
    };

    // Add Plaid financial data if available — dramatically improves AI accuracy
    if (financial_context) {
      promptPayload.financial_context = financial_context;
    }

    const userPrompt = JSON.stringify(promptPayload, null, 2);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      const error = new Error(`OpenAI API failed: ${errorText}`);
      error.statusCode = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty response from GPT-4o');
      const error = new Error('Empty response from OpenAI GPT-4o');
      error.statusCode = 500;
      throw error;
    }

    // Parse and validate response
    const parsed = JSON.parse(content);
    const profile = parsed.investor_profile || parsed;

    // Validate all required fields are present
    const requiredFields = Object.keys(PROFILE_SCHEMA);
    const missingFields = requiredFields.filter(field => !profile[field]);

    if (missingFields.length > 0) {
      console.error('Missing fields in AI response:', missingFields);
      const error = new Error(`Missing required fields in AI response: ${missingFields.join(', ')}`);
      error.statusCode = 500;
      throw error;
    }

    // Return successful response
    return { 
      success: true,
      profile 
    };
  },
});

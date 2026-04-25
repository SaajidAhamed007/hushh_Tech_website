import { createClient } from "@supabase/supabase-js";
import { createHandler } from "./_core/createHandler.js";
import { publicInvestorProfileSchema } from "./schemas/public-investor-profile.schema.js";

const getServiceClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are missing");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const isPublicProfileFieldVisible = (
  privacySettings,
  section,
  field
) => {
  if (!privacySettings || typeof privacySettings !== "object") {
    return true;
  }

  const sectionSettings = privacySettings?.[section];
  const fieldSetting = sectionSettings?.[field];

  if (fieldSetting == null) {
    return true;
  }

  if (typeof fieldSetting === "boolean") {
    return fieldSetting;
  }

  if (
    typeof fieldSetting === "object" &&
    typeof fieldSetting?.value === "boolean"
  ) {
    return fieldSetting.value;
  }

  return true;
};

export const maskPublicEmail = (email) => {
  if (!email || !email.includes("@")) {
    return null;
  }

  const [username, domain] = email.split("@");

  if (!username || !domain) {
    return null;
  }

  if (username.length <= 2) {
    return `${username.slice(0, 1)}***@${domain}`;
  }

  return `${username.slice(0, 1)}***${username.slice(-1)}@${domain}`;
};

export const buildPublicInvestorProfilePayload = (
  profileRow,
  onboardingRow = null
) => {
  const privacySettings = profileRow?.privacy_settings || {};
  const isConfirmed = Boolean(profileRow?.user_confirmed);
  const investorProfile =
    isConfirmed && profileRow?.investor_profile && typeof profileRow.investor_profile === "object"
      ? Object.fromEntries(
          Object.entries(profileRow.investor_profile).filter(([fieldName]) =>
            isPublicProfileFieldVisible(
              privacySettings,
              "investor_profile",
              fieldName
            )
          )
        )
      : null;

  const filteredOnboardingData = isConfirmed
    ? {
        account_type: isPublicProfileFieldVisible(
          privacySettings,
          "onboarding_data",
          "account_type"
        )
          ? onboardingRow?.account_type || null
          : null,
        selected_fund: isPublicProfileFieldVisible(
          privacySettings,
          "onboarding_data",
          "selected_fund"
        )
          ? onboardingRow?.selected_fund || null
          : null,
        citizenship_country: isPublicProfileFieldVisible(
          privacySettings,
          "onboarding_data",
          "citizenship_country"
        )
          ? onboardingRow?.citizenship_country || null
          : null,
        residence_country: isPublicProfileFieldVisible(
          privacySettings,
          "onboarding_data",
          "residence_country"
        )
          ? onboardingRow?.residence_country || null
          : null,
      }
    : null;

  const onboardingData =
    filteredOnboardingData &&
    Object.values(filteredOnboardingData).some((value) => value !== null)
      ? filteredOnboardingData
      : null;

  return {
    slug: profileRow.slug,
    profile_url: `https://hushhtech.com/investor/${profileRow.slug}`,
    is_confirmed: isConfirmed,
    basic_info: {
      name: isPublicProfileFieldVisible(privacySettings, "basic_info", "name")
        ? profileRow.name?.trim() || "Public Investor"
        : "Public Investor",
      email: isPublicProfileFieldVisible(privacySettings, "basic_info", "email")
        ? maskPublicEmail(profileRow.email)
        : null,
      age: isPublicProfileFieldVisible(privacySettings, "basic_info", "age")
        ? profileRow.age ?? null
        : null,
      organisation: isPublicProfileFieldVisible(
        privacySettings,
        "basic_info",
        "organisation"
      )
        ? profileRow.organisation?.trim() || null
        : null,
    },
    investor_profile:
      investorProfile && Object.keys(investorProfile).length > 0
        ? investorProfile
        : null,
    onboarding_data: onboardingData,
    shadow_profile: isConfirmed ? profileRow.shadow_profile || null : null,
  };
};

export default createHandler({
  // Schema is removed from config as it validates the body, which is not used in GET.
  // Instead, we manually parse and validate the slug from query parameters.
  timeout: 5000,
  handler: async ({ req, res }) => {
    // Manually parse and validate the slug from query parameters
    let slug;
    try {
      const validated = publicInvestorProfileSchema.parse({
        slug: req.query?.slug,
      });
      slug = validated.slug;
    } catch (error) {
      const validationError = new Error("Invalid or missing slug parameter");
      validationError.statusCode = 400;
      throw validationError;
    }

    const supabase = getServiceClient();
    const { data: profileRow, error: profileError } = await supabase
      .from("investor_profiles")
      .select(
        "slug,user_id,name,email,age,organisation,is_public,user_confirmed,privacy_settings,investor_profile,shadow_profile"
      )
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();

    if (profileError) {
      console.error("Database error fetching profile:", profileError);
      const error = new Error("Failed to fetch profile");
      error.statusCode = 500;
      throw error;
    }

    if (!profileRow) {
      const error = new Error("Profile not found or is private");
      error.statusCode = 404;
      throw error;
    }

    const { data: onboardingRow, error: onboardingError } = await supabase
      .from("onboarding_data")
      .select(
        "account_type,selected_fund,citizenship_country,residence_country"
      )
      .eq("user_id", profileRow.user_id)
      .maybeSingle();

    if (onboardingError && onboardingError.code !== "PGRST116") {
      console.error("Database error fetching onboarding data:", onboardingError);
      const error = new Error("Failed to fetch profile data");
      error.statusCode = 500;
      throw error;
    }

    res.setHeader("Cache-Control", "no-store");
    return buildPublicInvestorProfilePayload(profileRow, onboardingRow);
  },
});


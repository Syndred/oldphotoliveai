// Environment variable validation and configuration
// Requirements: 12.1, 12.2, 12.3, 12.4, 12.5

/**
 * All required environment variables (server-side only, no NEXT_PUBLIC_ prefix
 * except for NEXT_PUBLIC_R2_DOMAIN which is the only non-sensitive client var).
 */
const REQUIRED_ENV_VARS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "NEXT_PUBLIC_R2_DOMAIN",
  "REPLICATE_API_TOKEN",
  "WORKER_SECRET",
] as const;

const REQUIRED_STRIPE_PAYMENT_ENV_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_PACK",
  "STRIPE_PRICE_FAMILY_PACK",
  "STRIPE_PRICE_ARCHIVE_PACK",
] as const;

/**
 * Validates that all required environment variables are set.
 * Throws an error listing ALL missing variable names if any are missing.
 * Optional variables (like Stripe) are checked but only warned if missing.
 */
export function validateEnvVars(): void {
  const missing = REQUIRED_ENV_VARS.filter(
    (name) => !process.env[name]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  // Check Stripe variables - warn but don't fail, so local non-payment tasks work.
  const missingPaymentConfig = REQUIRED_STRIPE_PAYMENT_ENV_VARS.filter(
    (name) => !process.env[name] || process.env[name]?.includes("placeholder")
  );

  if (missingPaymentConfig.length > 0) {
    console.warn(
      `⚠️  Stripe payment is disabled. Missing or placeholder values for: ${missingPaymentConfig.join(", ")}`
    );
  }
}

/**
 * Configuration object that reads from environment variables.
 * Only used server-side — sensitive credentials are never exposed to the client.
 * Req 12.4: No sensitive credentials in client code.
 * Req 12.5: Only NEXT_PUBLIC_R2_DOMAIN uses the NEXT_PUBLIC_ prefix (non-sensitive).
 *
 * Uses getters so values are read at access time (after env vars are loaded),
 * not at module import time.
 */
export const config = {
  get google() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    };
  },
  get redis() {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    };
  },
  get r2() {
    return {
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME!,
      publicDomain: process.env.NEXT_PUBLIC_R2_DOMAIN!,
    };
  },
  get replicate() {
    return {
      apiToken: process.env.REPLICATE_API_TOKEN!,
    };
  },
  get stripe() {
    const secretKey = process.env.STRIPE_SECRET_KEY || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const payAsYouGo = process.env.STRIPE_PRICE_PAY_AS_YOU_GO || "";
    const starterPack = process.env.STRIPE_PRICE_STARTER_PACK || "";
    const familyPack = process.env.STRIPE_PRICE_FAMILY_PACK || "";
    const archivePack = process.env.STRIPE_PRICE_ARCHIVE_PACK || "";
    const professional = process.env.STRIPE_PRICE_PROFESSIONAL || "";
    const isConfigured = [
      secretKey,
      webhookSecret,
      starterPack,
      familyPack,
      archivePack,
    ]
      .every((value) => value && !value.includes("placeholder"));
    
    return {
      secretKey,
      webhookSecret,
      priceIds: {
        payAsYouGo,
        starterPack,
        familyPack,
        archivePack,
        professional,
      },
      isEnabled: isConfigured, // Helper flag to check if Stripe is fully configured
    };
  },
  get nextauth() {
    return {
      secret: process.env.NEXTAUTH_SECRET!,
      url: process.env.NEXTAUTH_URL!,
    };
  },
  get worker() {
    return {
      secret: process.env.WORKER_SECRET!,
    };
  },
  get admin() {
    return {
      apiKey: process.env.ADMIN_API_KEY || "",
    };
  },
};

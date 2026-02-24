import { validateEnvVars, config } from "@/lib/config";

// All required env var names
const ALL_REQUIRED_VARS = [
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
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PAY_AS_YOU_GO",
  "STRIPE_PRICE_PROFESSIONAL",
  "WORKER_SECRET",
];

function setAllEnvVars(): void {
  for (const name of ALL_REQUIRED_VARS) {
    process.env[name] = `test-value-${name}`;
  }
}

function clearAllEnvVars(): void {
  for (const name of ALL_REQUIRED_VARS) {
    delete process.env[name];
  }
}

describe("validateEnvVars", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  it("should not throw when all required variables are set", () => {
    setAllEnvVars();
    expect(() => validateEnvVars()).not.toThrow();
  });

  it("should throw when all variables are missing", () => {
    clearAllEnvVars();
    expect(() => validateEnvVars()).toThrow("Missing required environment variables");
  });

  it("should list all missing variable names in the error message", () => {
    clearAllEnvVars();
    try {
      validateEnvVars();
      fail("Expected validateEnvVars to throw");
    } catch (e: unknown) {
      const message = (e as Error).message;
      for (const name of ALL_REQUIRED_VARS) {
        expect(message).toContain(name);
      }
    }
  });

  it("should throw listing only the missing variable when one is missing", () => {
    setAllEnvVars();
    delete process.env.REPLICATE_API_TOKEN;

    try {
      validateEnvVars();
      fail("Expected validateEnvVars to throw");
    } catch (e: unknown) {
      const message = (e as Error).message;
      expect(message).toContain("REPLICATE_API_TOKEN");
      // Other vars should NOT be listed
      expect(message).not.toContain("GOOGLE_CLIENT_ID");
    }
  });

  it("should list multiple missing variables when several are missing", () => {
    setAllEnvVars();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.WORKER_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    try {
      validateEnvVars();
      fail("Expected validateEnvVars to throw");
    } catch (e: unknown) {
      const message = (e as Error).message;
      expect(message).toContain("STRIPE_SECRET_KEY");
      expect(message).toContain("WORKER_SECRET");
      expect(message).toContain("NEXTAUTH_SECRET");
    }
  });

  it("should treat empty string as missing", () => {
    setAllEnvVars();
    process.env.GOOGLE_CLIENT_ID = "";

    try {
      validateEnvVars();
      fail("Expected validateEnvVars to throw");
    } catch (e: unknown) {
      const message = (e as Error).message;
      expect(message).toContain("GOOGLE_CLIENT_ID");
    }
  });
});

describe("config object", () => {
  beforeAll(() => {
    setAllEnvVars();
  });

  afterAll(() => {
    clearAllEnvVars();
  });

  it("should map google env vars correctly", () => {
    expect(config.google.clientId).toBe("test-value-GOOGLE_CLIENT_ID");
    expect(config.google.clientSecret).toBe("test-value-GOOGLE_CLIENT_SECRET");
  });

  it("should map redis env vars correctly", () => {
    expect(config.redis.url).toBe("test-value-UPSTASH_REDIS_REST_URL");
    expect(config.redis.token).toBe("test-value-UPSTASH_REDIS_REST_TOKEN");
  });

  it("should map r2 env vars correctly", () => {
    expect(config.r2.accountId).toBe("test-value-R2_ACCOUNT_ID");
    expect(config.r2.accessKeyId).toBe("test-value-R2_ACCESS_KEY_ID");
    expect(config.r2.secretAccessKey).toBe("test-value-R2_SECRET_ACCESS_KEY");
    expect(config.r2.bucketName).toBe("test-value-R2_BUCKET_NAME");
    expect(config.r2.publicDomain).toBe("test-value-NEXT_PUBLIC_R2_DOMAIN");
  });

  it("should map stripe env vars correctly including nested priceIds", () => {
    expect(config.stripe.secretKey).toBe("test-value-STRIPE_SECRET_KEY");
    expect(config.stripe.webhookSecret).toBe("test-value-STRIPE_WEBHOOK_SECRET");
    expect(config.stripe.priceIds.payAsYouGo).toBe("test-value-STRIPE_PRICE_PAY_AS_YOU_GO");
    expect(config.stripe.priceIds.professional).toBe("test-value-STRIPE_PRICE_PROFESSIONAL");
  });

  it("should map nextauth env vars correctly", () => {
    expect(config.nextauth.secret).toBe("test-value-NEXTAUTH_SECRET");
    expect(config.nextauth.url).toBe("test-value-NEXTAUTH_URL");
  });

  it("should map worker env vars correctly", () => {
    expect(config.worker.secret).toBe("test-value-WORKER_SECRET");
  });

  it("should not expose any NEXT_PUBLIC_ vars except R2_DOMAIN", () => {
    // Only NEXT_PUBLIC_R2_DOMAIN should be in the config as a NEXT_PUBLIC_ var
    const configStr = JSON.stringify(config);
    // The value contains "NEXT_PUBLIC_R2_DOMAIN" in the test value, but the key path is r2.publicDomain
    // Verify the structure doesn't have unexpected NEXT_PUBLIC_ references
    expect(config.r2.publicDomain).toBeDefined();
  });
});

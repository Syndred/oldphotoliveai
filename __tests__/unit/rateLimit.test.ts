// Unit tests for rate limiting (Edge-compatible fetch-based implementation)
// Tests: src/lib/rateLimit.ts

import { RATE_LIMITS } from "@/types";

// Set required env vars before importing
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

// ── Mock fetch for Upstash REST API ─────────────────────────────────────────

let fetchSpy: jest.SpyInstance;

function mockRedisResponses(incrResult: number) {
  fetchSpy
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: incrResult }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 1 }),
    });
}

function mockRedisResponsesRaw(incrResult: unknown) {
  fetchSpy
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: incrResult }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 1 }),
    });
}

beforeEach(() => {
  fetchSpy = jest.spyOn(global, "fetch").mockImplementation();
});

afterEach(() => {
  fetchSpy.mockRestore();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  // Re-import each test to avoid module caching issues
  async function getCheckRateLimit() {
    const mod = await import("@/lib/rateLimit");
    return mod.checkRateLimit;
  }

  it("should allow the first request and return correct remaining count", async () => {
    mockRedisResponses(1);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const result = await checkRateLimit("user-1", "api");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.api.maxRequests - 1);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("should call EXPIRE on first request in a window", async () => {
    mockRedisResponses(1);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    await checkRateLimit("user-1", "api");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const expireBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(expireBody[0]).toBe("EXPIRE");
    const expireSeconds = Math.floor(RATE_LIMITS.api.windowMs / 1000) + 1;
    expect(expireBody[2]).toBe(expireSeconds);
  });

  it("should handle string INCR response and still call EXPIRE", async () => {
    mockRedisResponsesRaw("1");
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    await checkRateLimit("user-1", "api");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const expireBody = JSON.parse(fetchSpy.mock.calls[1][1].body);
    expect(expireBody[0]).toBe("EXPIRE");
  });

  it("should NOT call EXPIRE on subsequent requests", async () => {
    mockRedisResponses(5);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    await checkRateLimit("user-1", "api");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should deny request when count exceeds api limit (100)", async () => {
    mockRedisResponses(101);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const result = await checkRateLimit("user-1", "api");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow request at exactly the api limit (100)", async () => {
    mockRedisResponses(100);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const result = await checkRateLimit("user-1", "api");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should deny request when count exceeds upload limit", async () => {
    mockRedisResponses(RATE_LIMITS.upload.maxRequests + 1);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const result = await checkRateLimit("user-1", "upload");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow request at exactly the upload limit", async () => {
    mockRedisResponses(RATE_LIMITS.upload.maxRequests);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const result = await checkRateLimit("user-1", "upload");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should use correct Redis key format in INCR command", async () => {
    mockRedisResponses(1);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    await checkRateLimit("user-abc", "upload");
    const incrBody = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(incrBody[0]).toBe("INCR");
    expect(incrBody[1]).toMatch(/^ratelimit:upload:user-abc:\d+$/);
  });

  it("should return resetAt as start of next window", async () => {
    mockRedisResponses(1);
    const checkRateLimit = (await import("@/lib/rateLimit")).checkRateLimit;
    const before = Date.now();
    const result = await checkRateLimit("user-1", "api");
    const windowMs = RATE_LIMITS.api.windowMs;
    const currentWindowId = Math.floor(before / windowMs);
    const expectedResetAt = (currentWindowId + 1) * windowMs;
    expect(result.resetAt).toBeGreaterThanOrEqual(expectedResetAt);
    expect(result.resetAt).toBeLessThanOrEqual(expectedResetAt + windowMs);
  });
});

// Unit tests for rate limiting
// Tests: src/lib/rateLimit.ts

import { checkRateLimit } from "@/lib/rateLimit";
import { RATE_LIMITS } from "@/types";

// ── Mock Redis ──────────────────────────────────────────────────────────────

const mockIncr = jest.fn();
const mockExpire = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({
    incr: mockIncr,
    expire: mockExpire,
  }),
}));

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe("checkRateLimit", () => {
  it("should allow the first request and return correct remaining count", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    const result = await checkRateLimit("user-1", "api");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(RATE_LIMITS.api.maxRequests - 1);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("should set expiration on first request in a window", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    await checkRateLimit("user-1", "api");

    expect(mockExpire).toHaveBeenCalledTimes(1);
    const expireSeconds = Math.floor(RATE_LIMITS.api.windowMs / 1000) + 1;
    expect(mockExpire).toHaveBeenCalledWith(
      expect.stringContaining("ratelimit:api:user-1:"),
      expireSeconds
    );
  });

  it("should NOT set expiration on subsequent requests", async () => {
    mockIncr.mockResolvedValue(5);

    await checkRateLimit("user-1", "api");

    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("should deny request when count exceeds api limit (100)", async () => {
    mockIncr.mockResolvedValue(101);

    const result = await checkRateLimit("user-1", "api");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow request at exactly the api limit (100)", async () => {
    mockIncr.mockResolvedValue(100);

    const result = await checkRateLimit("user-1", "api");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should deny request when count exceeds upload limit (10)", async () => {
    mockIncr.mockResolvedValue(11);

    const result = await checkRateLimit("user-1", "upload");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should allow request at exactly the upload limit (10)", async () => {
    mockIncr.mockResolvedValue(10);

    const result = await checkRateLimit("user-1", "upload");

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should use correct Redis key format", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    await checkRateLimit("user-abc", "upload");

    const calledKey = mockIncr.mock.calls[0][0] as string;
    expect(calledKey).toMatch(/^ratelimit:upload:user-abc:\d+$/);
  });

  it("should return resetAt as start of next window", async () => {
    mockIncr.mockResolvedValue(1);
    mockExpire.mockResolvedValue(true);

    const before = Date.now();
    const result = await checkRateLimit("user-1", "api");

    const windowMs = RATE_LIMITS.api.windowMs;
    const currentWindowId = Math.floor(before / windowMs);
    const expectedResetAt = (currentWindowId + 1) * windowMs;

    // resetAt should be close to expected (within one window boundary)
    expect(result.resetAt).toBeGreaterThanOrEqual(expectedResetAt);
    expect(result.resetAt).toBeLessThanOrEqual(expectedResetAt + windowMs);
  });
});

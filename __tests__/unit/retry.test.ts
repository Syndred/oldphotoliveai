import { withRetry } from "@/lib/retry";

// Speed up tests by using tiny delays
const FAST_CONFIG = { baseDelay: 1, maxDelay: 10, backoffMultiplier: 2 };

describe("withRetry", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should return the result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, FAST_CONFIG);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and return on eventual success", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, FAST_CONFIG);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should throw the last error after all retries are exhausted", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));

    await expect(withRetry(fn, { ...FAST_CONFIG, maxRetries: 2 })).rejects.toThrow(
      "always fails"
    );
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should retry up to maxRetries times (default 2)", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("err"));

    await expect(withRetry(fn, FAST_CONFIG)).rejects.toThrow("err");
    // default maxRetries is 2 → 3 total calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should respect custom maxRetries", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("err"));

    await expect(
      withRetry(fn, { ...FAST_CONFIG, maxRetries: 1 })
    ).rejects.toThrow("err");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should succeed on the last retry attempt", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("finally");

    const result = await withRetry(fn, { ...FAST_CONFIG, maxRetries: 2 });
    expect(result).toBe("finally");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should cap delay at maxDelay", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");

    // baseDelay=100, backoffMultiplier=100, maxDelay=50
    // calculated delay = 100 * 100^0 = 100, capped to 50
    const start = Date.now();
    await withRetry(fn, {
      baseDelay: 100,
      maxDelay: 50,
      backoffMultiplier: 100,
      maxRetries: 1,
    });
    const elapsed = Date.now() - start;
    // Should be around 50ms, not 100ms
    expect(elapsed).toBeLessThan(100);
  });

  it("should log errors on retry attempts", async () => {
    const consoleSpy = jest.spyOn(console, "error");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("oops"))
      .mockResolvedValue("ok");

    await withRetry(fn, FAST_CONFIG);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[retry]"),
      "oops"
    );
  });

  it("should not log on first success", async () => {
    const consoleSpy = jest.spyOn(console, "error");
    const fn = jest.fn().mockResolvedValue("ok");

    await withRetry(fn, FAST_CONFIG);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("should handle non-Error throws", async () => {
    const fn = jest.fn().mockRejectedValue("string error");

    await expect(withRetry(fn, { ...FAST_CONFIG, maxRetries: 0 })).rejects.toBe(
      "string error"
    );
  });
});

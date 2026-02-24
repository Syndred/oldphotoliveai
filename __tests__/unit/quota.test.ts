import {
  initializeFreeQuota,
  checkAndDecrementQuota,
  getQuotaInfo,
  addCredits,
  cleanExpiredCredits,
  resetAllDailyQuotas,
} from "@/lib/quota";
import type { QuotaInfo } from "@/types";

// ── In-memory Redis mock ────────────────────────────────────────────────────

const store = new Map<string, unknown>();
const sets = new Map<string, Set<string>>();

const redisMock = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: unknown) => {
    store.set(key, value);
  }),
  sadd: jest.fn(async (key: string, ...members: string[]) => {
    if (!sets.has(key)) sets.set(key, new Set());
    const s = sets.get(key)!;
    for (const m of members) s.add(m);
  }),
  srem: jest.fn(async (key: string, ...members: string[]) => {
    const s = sets.get(key);
    if (!s) return;
    for (const m of members) s.delete(m);
  }),
  smembers: jest.fn(async (key: string) => {
    const s = sets.get(key);
    return s ? Array.from(s) : [];
  }),
};

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => redisMock),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://fake.upstash.io", token: "fake-token" },
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function clearStore() {
  store.clear();
  sets.clear();
  jest.clearAllMocks();
}

function getStoredQuota(userId: string): QuotaInfo | null {
  const raw = store.get(`quota:${userId}`);
  if (!raw) return null;
  // Upstash auto-deserializes, so mock stores objects directly
  if (typeof raw === "string") return JSON.parse(raw) as QuotaInfo;
  return raw as QuotaInfo;
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(clearStore);

// ── initializeFreeQuota ─────────────────────────────────────────────────────

describe("initializeFreeQuota", () => {
  it("sets remaining=1 and dailyLimit=1 for a free user", async () => {
    await initializeFreeQuota("u1");

    const quota = getStoredQuota("u1");
    expect(quota).not.toBeNull();
    expect(quota!.remaining).toBe(1);
    expect(quota!.dailyLimit).toBe(1);
    expect(quota!.tier).toBe("free");
    expect(quota!.credits).toBe(0);
    expect(quota!.creditsExpireAt).toBeNull();
  });

  it("sets a valid resetAt timestamp (next UTC midnight)", async () => {
    await initializeFreeQuota("u1");

    const quota = getStoredQuota("u1");
    expect(quota!.resetAt).not.toBeNull();
    const resetDate = new Date(quota!.resetAt!);
    expect(resetDate.getUTCHours()).toBe(0);
    expect(resetDate.getUTCMinutes()).toBe(0);
    expect(resetDate.getUTCSeconds()).toBe(0);
    expect(resetDate.getTime()).toBeGreaterThan(Date.now());
  });

  it("adds userId to the daily users set", async () => {
    await initializeFreeQuota("u1");

    expect(redisMock.sadd).toHaveBeenCalledWith("quota:daily:users", "u1");
    expect(sets.get("quota:daily:users")?.has("u1")).toBe(true);
  });
});

// ── checkAndDecrementQuota ──────────────────────────────────────────────────

describe("checkAndDecrementQuota", () => {
  it("allows professional users without any quota record", async () => {
    const result = await checkAndDecrementQuota("u1", "professional");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(Infinity);
  });

  it("decrements free user remaining from 1 to 0", async () => {
    await initializeFreeQuota("u1");

    const result = await checkAndDecrementQuota("u1", "free");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);

    const quota = getStoredQuota("u1");
    expect(quota!.remaining).toBe(0);
  });

  it("rejects free user when remaining is 0", async () => {
    await initializeFreeQuota("u1");
    await checkAndDecrementQuota("u1", "free"); // use up the 1

    const result = await checkAndDecrementQuota("u1", "free");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBeDefined();
  });

  it("decrements pay_as_you_go credits", async () => {
    await addCredits("u1", 5, 30);

    const result = await checkAndDecrementQuota("u1", "pay_as_you_go");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("rejects pay_as_you_go user with 0 credits", async () => {
    await addCredits("u1", 1, 30);
    await checkAndDecrementQuota("u1", "pay_as_you_go"); // use the 1

    const result = await checkAndDecrementQuota("u1", "pay_as_you_go");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("returns not allowed when quota is not initialized", async () => {
    const result = await checkAndDecrementQuota("u1", "free");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ── getQuotaInfo ────────────────────────────────────────────────────────────

describe("getQuotaInfo", () => {
  it("returns default empty quota for unknown user", async () => {
    const info = await getQuotaInfo("unknown");
    expect(info.userId).toBe("unknown");
    expect(info.remaining).toBe(0);
    expect(info.credits).toBe(0);
  });

  it("returns stored quota after initialization", async () => {
    await initializeFreeQuota("u1");

    const info = await getQuotaInfo("u1");
    expect(info.userId).toBe("u1");
    expect(info.remaining).toBe(1);
    expect(info.dailyLimit).toBe(1);
    expect(info.tier).toBe("free");
  });
});

// ── addCredits ──────────────────────────────────────────────────────────────

describe("addCredits", () => {
  it("adds credits with expiration", async () => {
    await addCredits("u1", 5, 30);

    const quota = getStoredQuota("u1");
    expect(quota!.credits).toBe(5);
    expect(quota!.tier).toBe("pay_as_you_go");
    expect(quota!.creditsExpireAt).not.toBeNull();

    const expireDate = new Date(quota!.creditsExpireAt!);
    const now = new Date();
    // Should expire roughly 30 days from now
    const diffDays =
      (expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThanOrEqual(30);
  });

  it("accumulates credits on repeated purchases", async () => {
    await addCredits("u1", 5, 30);
    await addCredits("u1", 5, 30);

    const quota = getStoredQuota("u1");
    expect(quota!.credits).toBe(10);
  });

  it("removes user from daily reset set", async () => {
    await initializeFreeQuota("u1");
    expect(sets.get("quota:daily:users")?.has("u1")).toBe(true);

    await addCredits("u1", 5, 30);
    expect(sets.get("quota:daily:users")?.has("u1")).toBe(false);
  });
});

// ── cleanExpiredCredits ─────────────────────────────────────────────────────

describe("cleanExpiredCredits", () => {
  it("zeroes credits when expired", async () => {
    await addCredits("u1", 5, 30);

    // Manually set expiration to the past
    const quota = getStoredQuota("u1")!;
    quota.creditsExpireAt = new Date(Date.now() - 1000).toISOString();
    store.set("quota:u1", quota);

    await cleanExpiredCredits("u1");

    const updated = getStoredQuota("u1");
    expect(updated!.credits).toBe(0);
    expect(updated!.creditsExpireAt).toBeNull();
  });

  it("does nothing when credits are not expired", async () => {
    await addCredits("u1", 5, 30);

    await cleanExpiredCredits("u1");

    const quota = getStoredQuota("u1");
    expect(quota!.credits).toBe(5);
  });

  it("does nothing for non-existent user", async () => {
    await cleanExpiredCredits("nonexistent");
    // Should not throw
  });

  it("does nothing when credits are already 0", async () => {
    await initializeFreeQuota("u1");
    await cleanExpiredCredits("u1");

    const quota = getStoredQuota("u1");
    expect(quota!.credits).toBe(0);
  });
});

// ── resetAllDailyQuotas ─────────────────────────────────────────────────────

describe("resetAllDailyQuotas", () => {
  it("resets all free users' remaining to 1", async () => {
    await initializeFreeQuota("u1");
    await initializeFreeQuota("u2");

    // Use up quotas
    await checkAndDecrementQuota("u1", "free");
    await checkAndDecrementQuota("u2", "free");

    expect(getStoredQuota("u1")!.remaining).toBe(0);
    expect(getStoredQuota("u2")!.remaining).toBe(0);

    await resetAllDailyQuotas();

    expect(getStoredQuota("u1")!.remaining).toBe(1);
    expect(getStoredQuota("u2")!.remaining).toBe(1);
  });

  it("updates resetAt to next UTC midnight", async () => {
    await initializeFreeQuota("u1");
    await checkAndDecrementQuota("u1", "free");

    await resetAllDailyQuotas();

    const quota = getStoredQuota("u1");
    const resetDate = new Date(quota!.resetAt!);
    expect(resetDate.getUTCHours()).toBe(0);
    expect(resetDate.getUTCMinutes()).toBe(0);
  });

  it("does nothing when no free users exist", async () => {
    await resetAllDailyQuotas();
    // Should not throw
  });
});

// ── Integration: expired credits + checkAndDecrement ────────────────────────

describe("checkAndDecrementQuota with expired credits", () => {
  it("cleans expired credits before checking, then rejects", async () => {
    await addCredits("u1", 5, 30);

    // Expire the credits
    const quota = getStoredQuota("u1")!;
    quota.creditsExpireAt = new Date(Date.now() - 1000).toISOString();
    store.set("quota:u1", quota);

    const result = await checkAndDecrementQuota("u1", "pay_as_you_go");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);

    // Credits should be zeroed
    const updated = getStoredQuota("u1");
    expect(updated!.credits).toBe(0);
  });
});

import { acquireLock, releaseLock } from "@/lib/lock";

// ── In-memory lock store ────────────────────────────────────────────────────

const lockStore = new Map<string, { value: string; expiresAt: number }>();

const redisMock = {
  set: jest.fn(
    async (
      key: string,
      value: string,
      opts?: { nx?: boolean; ex?: number }
    ) => {
      if (opts?.nx && lockStore.has(key)) {
        // NX: only set if not exists
        return null;
      }
      const expiresAt = opts?.ex
        ? Date.now() + opts.ex * 1000
        : Infinity;
      lockStore.set(key, { value, expiresAt });
      return "OK";
    }
  ),
  del: jest.fn(async (key: string) => {
    lockStore.delete(key);
    return 1;
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

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  lockStore.clear();
  jest.clearAllMocks();
});

describe("acquireLock", () => {
  it("acquires a lock successfully when key does not exist", async () => {
    const result = await acquireLock("lock:task:t1");
    expect(result).toBe(true);
    expect(redisMock.set).toHaveBeenCalledWith("lock:task:t1", "locked", {
      nx: true,
      ex: 300,
    });
  });

  it("fails to acquire a lock when key already exists", async () => {
    await acquireLock("lock:task:t1");
    const result = await acquireLock("lock:task:t1");
    expect(result).toBe(false);
  });

  it("uses custom TTL when provided", async () => {
    await acquireLock("lock:task:t2", 60);
    expect(redisMock.set).toHaveBeenCalledWith("lock:task:t2", "locked", {
      nx: true,
      ex: 60,
    });
  });

  it("uses default TTL of 300 seconds", async () => {
    await acquireLock("lock:task:t3");
    expect(redisMock.set).toHaveBeenCalledWith("lock:task:t3", "locked", {
      nx: true,
      ex: 300,
    });
  });

  it("allows acquiring different locks concurrently", async () => {
    const r1 = await acquireLock("lock:task:a");
    const r2 = await acquireLock("lock:task:b");
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });
});

describe("releaseLock", () => {
  it("releases an existing lock", async () => {
    await acquireLock("lock:task:t1");
    await releaseLock("lock:task:t1");
    expect(redisMock.del).toHaveBeenCalledWith("lock:task:t1");
  });

  it("allows re-acquiring a lock after release", async () => {
    await acquireLock("lock:task:t1");
    await releaseLock("lock:task:t1");
    const result = await acquireLock("lock:task:t1");
    expect(result).toBe(true);
  });

  it("does not error when releasing a non-existent lock", async () => {
    await expect(releaseLock("lock:task:nonexistent")).resolves.not.toThrow();
  });
});

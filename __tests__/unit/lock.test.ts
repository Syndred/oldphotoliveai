import {
  acquireLock,
  refreshLock,
  releaseLock,
  LOCK_REFRESH_SCRIPT,
  LOCK_RELEASE_SCRIPT,
} from "@/lib/lock";

// In-memory lock store
const lockStore = new Map<string, { value: string; expiresAt: number }>();

const redisMock = {
  set: jest.fn(
    async (
      key: string,
      value: string,
      opts?: { nx?: boolean; xx?: boolean; ex?: number }
    ) => {
      if (opts?.nx && lockStore.has(key)) {
        return null;
      }
      if (opts?.xx && !lockStore.has(key)) {
        return null;
      }

      const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : Infinity;
      lockStore.set(key, { value, expiresAt });
      return "OK";
    }
  ),
  get: jest.fn(async (key: string) => {
    const item = lockStore.get(key);
    return item ? item.value : null;
  }),
  del: jest.fn(async (key: string) => {
    lockStore.delete(key);
    return 1;
  }),
  eval: jest.fn(async (_script: string, keys: string[], args: string[]) => {
    const item = lockStore.get(keys[0]);
    if (!item || item.value !== args[0]) return 0;
    if (args.length === 2) {
      item.expiresAt = Date.now() + Number(args[1]) * 1000;
      return 1;
    }
    lockStore.delete(keys[0]);
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

beforeEach(() => {
  lockStore.clear();
  jest.clearAllMocks();
});

describe("acquireLock", () => {
  it("acquires a lock lease when key does not exist", async () => {
    const lease = await acquireLock("lock:task:t1");

    expect(lease).not.toBeNull();
    expect(lease?.key).toBe("lock:task:t1");
    expect(typeof lease?.token).toBe("string");
    expect(redisMock.set).toHaveBeenCalledWith(
      "lock:task:t1",
      expect.any(String),
      { nx: true, ex: 300 }
    );
  });

  it("returns null when key already exists", async () => {
    const first = await acquireLock("lock:task:t1");
    expect(first).not.toBeNull();

    const second = await acquireLock("lock:task:t1");
    expect(second).toBeNull();
  });

  it("uses custom TTL when provided", async () => {
    const lease = await acquireLock("lock:task:t2", 60);
    expect(lease).not.toBeNull();
    expect(redisMock.set).toHaveBeenCalledWith(
      "lock:task:t2",
      expect.any(String),
      { nx: true, ex: 60 }
    );
  });
});

describe("refreshLock", () => {
  it("refreshes TTL when worker still owns the lease", async () => {
    const lease = await acquireLock("lock:task:t1");
    expect(lease).not.toBeNull();

    const ok = await refreshLock(lease!, 120);
    expect(ok).toBe(true);
    expect(redisMock.eval).toHaveBeenCalledWith(
      LOCK_REFRESH_SCRIPT,
      ["lock:task:t1"],
      [lease!.token, "120"]
    );
  });

  it("returns false when lease ownership is lost", async () => {
    const lease = await acquireLock("lock:task:t1");
    expect(lease).not.toBeNull();

    lockStore.set("lock:task:t1", {
      value: "another-worker-token",
      expiresAt: Date.now() + 300_000,
    });

    const ok = await refreshLock(lease!);
    expect(ok).toBe(false);
  });
});

describe("releaseLock", () => {
  it("releases lock only when ownership token matches", async () => {
    const lease = await acquireLock("lock:task:t1");
    expect(lease).not.toBeNull();

    await releaseLock(lease!);
    expect(redisMock.eval).toHaveBeenCalledWith(
      LOCK_RELEASE_SCRIPT,
      ["lock:task:t1"],
      [lease!.token]
    );
  });

  it("does not delete lock when ownership token differs", async () => {
    const lease = await acquireLock("lock:task:t1");
    expect(lease).not.toBeNull();

    lockStore.set("lock:task:t1", {
      value: "another-worker-token",
      expiresAt: Date.now() + 300_000,
    });

    await releaseLock(lease!);
    expect(lockStore.get("lock:task:t1")?.value).toBe("another-worker-token");
  });
});

import {
  createOrGetUser,
  getUser,
  getUserByEmail,
  updateUserTier,
  createTask,
  updateTaskStatus,
  getTask,
  getUserTasks,
  cancelTask,
  retryTask,
  getRedisClient,
} from "@/lib/redis";
import type { Task } from "@/types";

// ── In-memory Redis mock ────────────────────────────────────────────────────

const store = new Map<string, string>();
const sortedSets = new Map<string, { score: number; member: string }[]>();

const redisMock = {
  get: jest.fn(async (key: string) => store.get(key) ?? null),
  set: jest.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
  zadd: jest.fn(
    async (key: string, entry: { score: number; member: string }) => {
      if (!sortedSets.has(key)) sortedSets.set(key, []);
      const set = sortedSets.get(key)!;
      // Remove existing entry with same member
      const idx = set.findIndex((e) => e.member === entry.member);
      if (idx !== -1) set.splice(idx, 1);
      set.push(entry);
      set.sort((a, b) => a.score - b.score);
    }
  ),
  zrange: jest.fn(async (key: string) => {
    const set = sortedSets.get(key);
    if (!set) return [];
    return set.map((e) => e.member);
  }),
  scan: jest.fn(async (cursor: string | number, options?: { match?: string; count?: number }) => {
    const allKeys = Array.from(store.keys());
    const matched = options?.match === "user:*"
      ? allKeys.filter((key) => key.startsWith("user:"))
      : allKeys;
    return [0, matched];
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
  sortedSets.clear();
  jest.clearAllMocks();
}

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(clearStore);

describe("getRedisClient", () => {
  it("returns a Redis instance", () => {
    const client = getRedisClient();
    expect(client).toBeDefined();
  });
});

// ── User CRUD ───────────────────────────────────────────────────────────────

describe("createOrGetUser", () => {
  it("creates a new user when Google ID does not exist", async () => {
    const user = await createOrGetUser("g123", "a@b.com", "Alice");

    expect(user.googleId).toBe("g123");
    expect(user.email).toBe("a@b.com");
    expect(user.name).toBe("Alice");
    expect(user.tier).toBe("free");
    expect(user.avatarUrl).toBeNull();
    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it("returns the same user on repeated calls (idempotent)", async () => {
    const first = await createOrGetUser("g123", "a@b.com", "Alice");
    const second = await createOrGetUser("g123", "a@b.com", "Alice");

    expect(second.id).toBe(first.id);
    expect(second.email).toBe(first.email);
  });

  it("creates different users for different Google IDs", async () => {
    const u1 = await createOrGetUser("g1", "a@b.com", "Alice");
    const u2 = await createOrGetUser("g2", "b@c.com", "Bob");

    expect(u1.id).not.toBe(u2.id);
  });
});

describe("getUser", () => {
  it("returns null for non-existent user", async () => {
    const user = await getUser("nonexistent");
    expect(user).toBeNull();
  });

  it("returns the user after creation", async () => {
    const created = await createOrGetUser("g1", "a@b.com", "Alice");
    const fetched = await getUser(created.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.email).toBe("a@b.com");
  });
});

describe("getUserByEmail", () => {
  it("returns user by email index", async () => {
    const created = await createOrGetUser("g3", "lookup@example.com", "Lookup User");
    const fetched = await getUserByEmail("lookup@example.com");

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
  });

  it("returns null when email is not found", async () => {
    const fetched = await getUserByEmail("missing@example.com");
    expect(fetched).toBeNull();
  });
});

describe("updateUserTier", () => {
  it("updates the user tier", async () => {
    const user = await createOrGetUser("g1", "a@b.com", "Alice");
    expect(user.tier).toBe("free");

    await updateUserTier(user.id, "professional");

    const updated = await getUser(user.id);
    expect(updated!.tier).toBe("professional");
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(user.updatedAt).getTime()
    );
  });

  it("throws for non-existent user", async () => {
    await expect(updateUserTier("no-such-id", "free")).rejects.toThrow(
      "User not found"
    );
  });
});

// ── Task CRUD ───────────────────────────────────────────────────────────────

describe("createTask", () => {
  it("creates a task with correct defaults", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "tasks/u1/img.jpg",
      priority: "normal",
    });

    expect(task.id).toBeDefined();
    expect(task.userId).toBe("u1");
    expect(task.status).toBe("pending");
    expect(task.priority).toBe("normal");
    expect(task.progress).toBe(0);
    expect(task.originalImageKey).toBe("tasks/u1/img.jpg");
    expect(task.restoredImageKey).toBeNull();
    expect(task.colorizedImageKey).toBeNull();
    expect(task.animationVideoKey).toBeNull();
    expect(task.errorMessage).toBeNull();
    expect(task.completedAt).toBeNull();
    expect(task.createdAt).toBeDefined();
  });

  it("adds the task to the user's sorted set", async () => {
    await createTask({
      userId: "u1",
      originalImageKey: "img1.jpg",
      priority: "normal",
    });
    await createTask({
      userId: "u1",
      originalImageKey: "img2.jpg",
      priority: "high",
    });

    const tasks = await getUserTasks("u1");
    expect(tasks).toHaveLength(2);
  });
});

describe("updateTaskStatus", () => {
  it("updates status and progress", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    await updateTaskStatus(task.id, "restoring");
    const updated = await getTask(task.id);
    expect(updated!.status).toBe("restoring");
    expect(updated!.progress).toBe(25);
  });

  it("sets completedAt when status is completed", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    await updateTaskStatus(task.id, "completed");
    const updated = await getTask(task.id);
    expect(updated!.status).toBe("completed");
    expect(updated!.progress).toBe(100);
    expect(updated!.completedAt).not.toBeNull();
  });

  it("preserves progress on failed status", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    await updateTaskStatus(task.id, "colorizing");
    await updateTaskStatus(task.id, "failed", {
      errorMessage: "Model error",
    });

    const updated = await getTask(task.id);
    expect(updated!.status).toBe("failed");
    expect(updated!.progress).toBe(50); // preserved from colorizing
    expect(updated!.errorMessage).toBe("Model error");
  });

  it("merges additional data fields", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    await updateTaskStatus(task.id, "restoring", {
      restoredImageKey: "tasks/u1/restored.jpg",
    });

    const updated = await getTask(task.id);
    expect(updated!.restoredImageKey).toBe("tasks/u1/restored.jpg");
  });

  it("throws for non-existent task", async () => {
    await expect(updateTaskStatus("no-task", "pending")).rejects.toThrow(
      "Task not found"
    );
  });
});

describe("getTask", () => {
  it("returns null for non-existent task", async () => {
    expect(await getTask("nonexistent")).toBeNull();
  });

  it("returns the task after creation", async () => {
    const created = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "high",
    });

    const fetched = await getTask(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.priority).toBe("high");
  });
});

describe("getUserTasks", () => {
  it("returns empty array for user with no tasks", async () => {
    const tasks = await getUserTasks("no-user");
    expect(tasks).toEqual([]);
  });

  it("returns tasks sorted by createdAt descending", async () => {
    // Create tasks with slight time gaps
    const t1 = await createTask({
      userId: "u1",
      originalImageKey: "img1.jpg",
      priority: "normal",
    });
    const t2 = await createTask({
      userId: "u1",
      originalImageKey: "img2.jpg",
      priority: "normal",
    });

    const tasks = await getUserTasks("u1");
    expect(tasks).toHaveLength(2);
    // Most recent first
    expect(
      new Date(tasks[0].createdAt).getTime()
    ).toBeGreaterThanOrEqual(new Date(tasks[1].createdAt).getTime());
  });

  it("only returns tasks for the specified user", async () => {
    await createTask({
      userId: "u1",
      originalImageKey: "img1.jpg",
      priority: "normal",
    });
    await createTask({
      userId: "u2",
      originalImageKey: "img2.jpg",
      priority: "normal",
    });

    const u1Tasks = await getUserTasks("u1");
    const u2Tasks = await getUserTasks("u2");

    expect(u1Tasks).toHaveLength(1);
    expect(u2Tasks).toHaveLength(1);
    expect(u1Tasks[0].userId).toBe("u1");
    expect(u2Tasks[0].userId).toBe("u2");
  });
});

describe("cancelTask", () => {
  it("cancels a pending task and returns true", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    const result = await cancelTask(task.id);
    expect(result).toBe(true);

    const updated = await getTask(task.id);
    expect(updated!.status).toBe("cancelled");
  });

  it("cancels a queued task and returns true", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });
    await updateTaskStatus(task.id, "queued");

    const result = await cancelTask(task.id);
    expect(result).toBe(true);

    const updated = await getTask(task.id);
    expect(updated!.status).toBe("cancelled");
  });

  it("returns false for a task in restoring status", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });
    await updateTaskStatus(task.id, "restoring");

    const result = await cancelTask(task.id);
    expect(result).toBe(false);

    const updated = await getTask(task.id);
    expect(updated!.status).toBe("restoring");
  });

  it("returns false for completed task", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });
    await updateTaskStatus(task.id, "completed");

    expect(await cancelTask(task.id)).toBe(false);
  });

  it("returns false for non-existent task", async () => {
    expect(await cancelTask("no-task")).toBe(false);
  });
});

describe("retryTask", () => {
  it("retries a failed task, resetting to queued", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });
    await updateTaskStatus(task.id, "failed", {
      errorMessage: "Something broke",
    });

    const retried = await retryTask(task.id);
    expect(retried.status).toBe("queued");
    expect(retried.progress).toBe(5);
    expect(retried.errorMessage).toBeNull();
    expect(retried.completedAt).toBeNull();
  });

  it("throws when task is not in failed status", async () => {
    const task = await createTask({
      userId: "u1",
      originalImageKey: "img.jpg",
      priority: "normal",
    });

    await expect(retryTask(task.id)).rejects.toThrow("not in failed status");
  });

  it("throws for non-existent task", async () => {
    await expect(retryTask("no-task")).rejects.toThrow("Task not found");
  });
});

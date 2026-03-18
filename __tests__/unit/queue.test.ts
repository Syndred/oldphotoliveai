import {
  enqueueTask,
  dequeueTask,
  getQueueLength,
  removeFromQueue,
} from "@/lib/queue";
import { PRIORITY_WEIGHTS } from "@/types";

// ── In-memory sorted set mock ──────────────────────────────────────────────

const sortedSet: { score: number; member: string }[] = [];

function clearSortedSet() {
  sortedSet.length = 0;
}

const redisMock = {
  zadd: jest.fn(
    async (_key: string, entry: { score: number; member: string }) => {
      const idx = sortedSet.findIndex((e) => e.member === entry.member);
      if (idx !== -1) sortedSet.splice(idx, 1);
      sortedSet.push(entry);
      sortedSet.sort((a, b) => a.score - b.score);
    }
  ),
  zpopmin: jest.fn(async (_key: string, _count: number) => {
    if (sortedSet.length === 0) return [];
    const item = sortedSet.shift()!;
    return [{ member: item.member, score: item.score }];
  }),
  zcount: jest.fn(
    async (_key: string, min: number | string, max: number | string) => {
      const minVal = min === "-inf" ? -Infinity : Number(min);
      const maxVal = max === "+inf" ? Infinity : Number(max);
      return sortedSet.filter(
        (e) => e.score >= minVal && e.score <= maxVal
      ).length;
    }
  ),
  zrem: jest.fn(async (_key: string, member: string) => {
    const idx = sortedSet.findIndex((e) => e.member === member);
    if (idx !== -1) sortedSet.splice(idx, 1);
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
  clearSortedSet();
  jest.clearAllMocks();
});

describe("enqueueTask", () => {
  it("adds an urgent-priority task with score = -1_000_000_000_000_000 + timestamp", async () => {
    const before = Date.now();
    await enqueueTask("task-urgent", "urgent");
    const after = Date.now();

    expect(redisMock.zadd).toHaveBeenCalledTimes(1);
    const call = redisMock.zadd.mock.calls[0];
    expect(call[0]).toBe("queue:tasks");
    const score = call[1].score;
    expect(score).toBeGreaterThanOrEqual(PRIORITY_WEIGHTS.urgent + before);
    expect(score).toBeLessThanOrEqual(PRIORITY_WEIGHTS.urgent + after);
  });

  it("adds a high-priority task with score = 0 + timestamp", async () => {
    const before = Date.now();
    await enqueueTask("task-1", "high");
    const after = Date.now();

    expect(redisMock.zadd).toHaveBeenCalledTimes(1);
    const call = redisMock.zadd.mock.calls[0];
    expect(call[0]).toBe("queue:tasks");
    const score = call[1].score;
    expect(score).toBeGreaterThanOrEqual(PRIORITY_WEIGHTS.high + before);
    expect(score).toBeLessThanOrEqual(PRIORITY_WEIGHTS.high + after);
  });

  it("adds a normal-priority task with score = 1_000_000_000_000_000 + timestamp", async () => {
    const before = Date.now();
    await enqueueTask("task-2", "normal");
    const after = Date.now();

    const call = redisMock.zadd.mock.calls[0];
    const score = call[1].score;
    expect(score).toBeGreaterThanOrEqual(PRIORITY_WEIGHTS.normal + before);
    expect(score).toBeLessThanOrEqual(PRIORITY_WEIGHTS.normal + after);
  });

  it("urgent-priority score is always less than high-priority score", async () => {
    await enqueueTask("urgent-task", "urgent");
    await enqueueTask("high-task", "high");

    const urgentScore = redisMock.zadd.mock.calls[0][1].score;
    const highScore = redisMock.zadd.mock.calls[1][1].score;
    expect(urgentScore).toBeLessThan(highScore);
  });

  it("high-priority score is always less than normal-priority score", async () => {
    await enqueueTask("high-task", "high");
    await enqueueTask("normal-task", "normal");

    const highScore = redisMock.zadd.mock.calls[0][1].score;
    const normalScore = redisMock.zadd.mock.calls[1][1].score;
    expect(highScore).toBeLessThan(normalScore);
  });
});

describe("dequeueTask", () => {
  it("returns null when queue is empty", async () => {
    const result = await dequeueTask();
    expect(result).toBeNull();
  });

  it("dequeues the highest-priority (lowest score) task", async () => {
    await enqueueTask("normal-task", "normal");
    await enqueueTask("high-task", "high");
    await enqueueTask("urgent-task", "urgent");

    const result = await dequeueTask();
    expect(result).toBe("urgent-task");
  });

  it("dequeues tasks in FIFO order within the same priority", async () => {
    await enqueueTask("task-a", "high");
    // Small delay to ensure different timestamps
    await enqueueTask("task-b", "high");

    const first = await dequeueTask();
    const second = await dequeueTask();
    expect(first).toBe("task-a");
    expect(second).toBe("task-b");
  });

  it("dequeues urgent, then high-priority tasks, then normal ones", async () => {
    await enqueueTask("normal-1", "normal");
    await enqueueTask("high-1", "high");
    await enqueueTask("urgent-1", "urgent");
    await enqueueTask("normal-2", "normal");
    await enqueueTask("high-2", "high");
    await enqueueTask("urgent-2", "urgent");

    const results: (string | null)[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(await dequeueTask());
    }

    expect(results[0]).toBe("urgent-1");
    expect(results[1]).toBe("urgent-2");
    expect(results[2]).toBe("high-1");
    expect(results[3]).toBe("high-2");
    expect(results[4]).toBe("normal-1");
    expect(results[5]).toBe("normal-2");
  });
});

describe("getQueueLength", () => {
  it("returns { urgent: 0, high: 0, normal: 0 } for empty queue", async () => {
    const length = await getQueueLength();
    expect(length).toEqual({ urgent: 0, high: 0, normal: 0 });
  });

  it("counts urgent, high and normal tasks separately", async () => {
    await enqueueTask("u1", "urgent");
    await enqueueTask("h1", "high");
    await enqueueTask("h2", "high");
    await enqueueTask("n1", "normal");

    const length = await getQueueLength();
    expect(length).toEqual({ urgent: 1, high: 2, normal: 1 });
  });
});

describe("removeFromQueue", () => {
  it("removes a task from the queue", async () => {
    await enqueueTask("task-1", "high");
    await enqueueTask("task-2", "normal");

    await removeFromQueue("task-1");

    const length = await getQueueLength();
    expect(length).toEqual({ urgent: 0, high: 0, normal: 1 });
  });

  it("does not error when removing a non-existent task", async () => {
    await expect(removeFromQueue("nonexistent")).resolves.not.toThrow();
  });
});

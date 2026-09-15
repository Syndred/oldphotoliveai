import type { Task, User } from "@/types";

const mockEval = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({ eval: mockEval }),
}));

jest.mock("uuid", () => ({ v4: () => "task-fixed-id" }));

import {
  AUTHENTICATED_CREATE_SCRIPT,
  createAuthenticatedTaskAtomic,
  createAnonymousTaskAtomic,
} from "@/lib/task-creation";

const user: User = {
  id: "user-1",
  googleId: "google-1",
  email: "person@example.com",
  name: "Person",
  avatarUrl: null,
  tier: "free",
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

beforeEach(() => mockEval.mockReset());

describe("atomic task creation", () => {
  it("persists expired-credit cleanup before refusing the task", () => {
    expect(AUTHENTICATED_CREATE_SCRIPT).toContain(
      "quota.creditsExpireAt = cjson.null\n    redis.call('SET', KEYS[1], cjson.encode(quota))"
    );
  });

  it("creates an authenticated task through one Redis script", async () => {
    mockEval.mockResolvedValue(["CREATED", "task-fixed-id", "0"]);

    const result = await createAuthenticatedTaskAtomic({
      user,
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      workflow: "colorize",
      now: new Date("2026-09-15T00:00:00.000Z"),
    });

    expect(result).toMatchObject({
      outcome: "created",
      remaining: 0,
      task: { id: "task-fixed-id", workflow: "colorize" },
    });
    expect(mockEval).toHaveBeenCalledTimes(1);
    const [script, keys, args] = mockEval.mock.calls[0] as [string, string[], string[]];
    expect(script).toContain("redis.call('ZADD', KEYS[4]");
    expect(keys).toContain("queue:tasks");
    expect(args).not.toContain(user.email);
  });

  it("returns an idempotent task without consuming allowance again", async () => {
    mockEval.mockResolvedValue(["EXISTING", "task-existing", "0"]);

    const result = await createAuthenticatedTaskAtomic({
      user,
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      workflow: "full",
    });

    expect(result).toEqual({ outcome: "existing", taskId: "task-existing", remaining: 0 });
  });

  it("classifies exhausted free quota without writing a task", async () => {
    mockEval.mockResolvedValue(["REJECTED", "DAILY_QUOTA_EXHAUSTED", "0"]);

    const result = await createAuthenticatedTaskAtomic({
      user,
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      workflow: "full",
    });

    expect(result).toEqual({
      outcome: "rejected",
      code: "DAILY_QUOTA_EXHAUSTED",
      remaining: 0,
    });
  });

  it("creates an anonymous user, task, trial and queue entry atomically", async () => {
    mockEval.mockResolvedValue(["CREATED", "task-fixed-id"]);

    const result = await createAnonymousTaskAtomic({
      visitorId: "visitor-1",
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      now: new Date("2026-09-15T00:00:00.000Z"),
    });

    expect(result).toMatchObject({ outcome: "created", task: { id: "task-fixed-id" } });
    expect(mockEval).toHaveBeenCalledTimes(1);
    const [, keys, args] = mockEval.mock.calls[0] as [string, string[], string[]];
    expect(keys).toEqual(expect.arrayContaining(["anonymous:visitor-1:trial", "queue:tasks"]));
    expect(args[5]).toMatch(/^task-fixed-id\|[a-f0-9]{64}$/);
    expect(args[6]).toMatch(/^[a-f0-9]{64}$/);
    expect(args.join(" ")).not.toContain("person@example.com");
  });

  it("recovers the existing anonymous task for a repeated request", async () => {
    mockEval.mockResolvedValue(["EXISTING", "task-existing"]);

    await expect(
      createAnonymousTaskAtomic({
        visitorId: "visitor-1",
        imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      })
    ).resolves.toEqual({ outcome: "existing", taskId: "task-existing" });
  });

  it("rejects a different upload after the anonymous trial is consumed", async () => {
    mockEval.mockResolvedValue(["REJECTED", "ANONYMOUS_TRIAL_USED"]);

    await expect(
      createAnonymousTaskAtomic({
        visitorId: "visitor-1",
        imageKey: "tasks/123e4567-e89b-12d3-a456-426614174999/original.jpg",
      })
    ).resolves.toEqual({
      outcome: "rejected",
      code: "ANONYMOUS_TRIAL_USED",
      remaining: 0,
    });
  });
});

type _TaskShapeCheck = Task;

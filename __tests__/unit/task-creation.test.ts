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
      user: { ...user, tier: "pay_as_you_go" },
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
      user: { ...user, tier: "pay_as_you_go" },
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      workflow: "full",
    });

    expect(result).toEqual({ outcome: "existing", taskId: "task-existing", remaining: 0 });
  });

  it("rejects free and anonymous creation without touching quota, queue or provider", async () => {
    expect(await createAuthenticatedTaskAtomic({user,imageKey:"source",workflow:"full"})).toEqual({outcome:"rejected",code:"PAYMENT_REQUIRED",remaining:0});
    expect(await createAnonymousTaskAtomic({visitorId:"visitor",imageKey:"source"})).toEqual({outcome:"rejected",code:"PAYMENT_REQUIRED",remaining:0});
    expect(mockEval).not.toHaveBeenCalled();
  });
});

type _TaskShapeCheck = Task;

it("snapshots purchased quality and keys upgrade replay by source instead of temporary copy", async () => {
  mockEval.mockResolvedValue(["CREATED", "task-fixed-id", "1"]);
  await createAuthenticatedTaskAtomic({ user: { ...user, tier: "pay_as_you_go" }, imageKey: "tasks/copy-a/original.jpg", workflow: "restore", upgradeSourceTaskId: "source" });
  await createAuthenticatedTaskAtomic({ user: { ...user, tier: "pay_as_you_go" }, imageKey: "tasks/copy-b/original.jpg", workflow: "restore", upgradeSourceTaskId: "source" });
  expect(mockEval.mock.calls[0][1][4]).toBe(mockEval.mock.calls[1][1][4]);
  expect(mockEval.mock.calls[0][1][4]).toMatch(/^task:upgrade:/);
  expect(JSON.parse(mockEval.mock.calls[0][2][1])).toMatchObject({ generationTier: "pay_as_you_go", upgradeSourceTaskId: "source" });
  expect(mockEval.mock.calls[0][2][6]).toBe("upgrade");
});


it("a stale preview feature flag cannot grant new free generations", async () => {
  const oldFlag = process.env.DOWNLOAD_PREVIEW_ENABLED;
  try {
    process.env.DOWNLOAD_PREVIEW_ENABLED = "true";
    expect(await createAuthenticatedTaskAtomic({user,imageKey:"source",workflow:"restore"})).toMatchObject({outcome:"rejected",code:"PAYMENT_REQUIRED"});
    expect(await createAnonymousTaskAtomic({visitorId:"visitor",imageKey:"source"})).toMatchObject({outcome:"rejected",code:"PAYMENT_REQUIRED"});
    expect(mockEval).not.toHaveBeenCalled();
  } finally {
    if(oldFlag === undefined) delete process.env.DOWNLOAD_PREVIEW_ENABLED;
    else process.env.DOWNLOAD_PREVIEW_ENABLED = oldFlag;
  }
});

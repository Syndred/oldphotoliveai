const mockEval = jest.fn();

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({ eval: mockEval }),
}));

import {
  claimNextTask,
  settleTaskClaim,
  TASK_CLAIM_SCRIPT,
  TASK_CLAIM_SETTLE_SCRIPT,
} from "@/lib/queue";

beforeEach(() => mockEval.mockReset());

describe("leased task queue claims", () => {
  it("atomically recovers expired claims before moving the next task to processing", async () => {
    mockEval.mockResolvedValue([
      "task-1",
      "1234",
      '{"taskId":"task-1","score":1234,"token":"claim-token"}',
    ]);

    await expect(claimNextTask(10_000, 300_000, "claim-token")).resolves.toEqual({
      taskId: "task-1",
      score: 1234,
      leaseMember: '{"taskId":"task-1","score":1234,"token":"claim-token"}',
    });

    expect(mockEval).toHaveBeenCalledWith(
      TASK_CLAIM_SCRIPT,
      ["queue:tasks", "queue:tasks:processing"],
      ["10000", "310000", "claim-token"]
    );
    expect(TASK_CLAIM_SCRIPT).toContain("ZRANGEBYSCORE");
    expect(TASK_CLAIM_SCRIPT).toContain("ZPOPMIN");
    expect(TASK_CLAIM_SCRIPT).toContain("queueClaim");
  });

  it("atomically requeues a claimed task when its persisted state is unfinished", async () => {
    mockEval.mockResolvedValue("REQUEUED");
    const claim = { taskId: "task-1", score: 1234, leaseMember: "claim-json" };

    await expect(settleTaskClaim(claim)).resolves.toBe("requeued");

    expect(mockEval).toHaveBeenCalledWith(
      TASK_CLAIM_SETTLE_SCRIPT,
      ["queue:tasks:processing", "queue:tasks", "task:task-1"],
      ["claim-json", "1234", "task-1"]
    );
    expect(TASK_CLAIM_SETTLE_SCRIPT).toContain("completed");
    expect(TASK_CLAIM_SETTLE_SCRIPT).toContain("failed");
    expect(TASK_CLAIM_SETTLE_SCRIPT).toContain("cancelled");
  });

  it.each([
    ["ACKED_TERMINAL", "acknowledged"],
    ["ACKED_MISSING", "acknowledged"],
    ["STALE", "stale"],
  ])("maps %s settlement safely", async (redisResult, expected) => {
    mockEval.mockResolvedValue(redisResult);
    await expect(
      settleTaskClaim({ taskId: "task-1", score: 1234, leaseMember: "claim-json" })
    ).resolves.toBe(expected);
  });
});

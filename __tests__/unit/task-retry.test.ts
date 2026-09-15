import type { Task } from "@/types";

const mockEval = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval }) }));

import { retryTaskAtomic, TASK_RETRY_SCRIPT } from "@/lib/task-retry";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";

const task: Task = {
  id: "task-1", userId: "user-1", status: "failed", priority: "normal", workflow: "animate",
  originalImageKey: "tasks/id/original.jpg", restoredImageKey: null, colorizedImageKey: null,
  animationVideoKey: null, errorMessage: "Service busy", internalErrorMessage: "429",
  failureStage: "animating", failureCode: "service_busy", attemptCount: 1,
  progress: 75, createdAt: "2026-09-15T00:00:00.000Z", completedAt: null,
};

beforeEach(() => mockEval.mockReset());

describe("retryTaskAtomic", () => {
  it("resets and enqueues a failed task in one script", async () => {
    mockEval.mockResolvedValue(["RETRIED", "2"]);
    await expect(retryTaskAtomic(task, new Date("2026-09-15T01:00:00.000Z"))).resolves.toEqual({
      outcome: "retried", attemptCount: 2,
    });
    expect(mockEval).toHaveBeenCalledTimes(1);
    expect(TASK_RETRY_SCRIPT).toContain("redis.call('SET', KEYS[1]");
    expect(TASK_RETRY_SCRIPT).toContain("redis.call('ZADD', KEYS[2]");
  });

  it("treats a repeated request for an already queued task as idempotent", async () => {
    mockEval.mockResolvedValue(["ALREADY_QUEUED", "2"]);
    await expect(retryTaskAtomic({ ...task, status: "queued" })).resolves.toEqual({
      outcome: "already_queued", attemptCount: 2,
    });
  });

  it("does not retry content violations", async () => {
    mockEval.mockResolvedValue(["REJECTED", "CONTENT_VIOLATION"]);
    await expect(retryTaskAtomic({ ...task, violation: true })).resolves.toEqual({
      outcome: "rejected", code: "CONTENT_VIOLATION",
    });
  });

  it("reports ambiguous provider creation as requiring manual review", async () => {
    mockEval.mockResolvedValue(["REJECTED", "MANUAL_REVIEW_REQUIRED"]);
    await expect(
      retryTaskAtomic({ ...task, failureCode: "provider_creation_unknown" })
    ).resolves.toEqual({
      outcome: "rejected",
      code: "MANUAL_REVIEW_REQUIRED",
    });
  });

  it("executes the production Lua branch without changing or enqueuing the task", async () => {
    const redis = new RedisLuaFixture();
    const ambiguousTask = {
      id: task.id,
      status: "failed",
      priority: "normal",
      attemptCount: 1,
      failureCode: "provider_creation_unknown",
    };
    redis.setString(`task:${task.id}`, JSON.stringify(ambiguousTask));

    await expect(
      redis.eval(
        TASK_RETRY_SCRIPT,
        [`task:${task.id}`, "queue:tasks"],
        ["1234", task.id]
      )
    ).resolves.toEqual(["REJECTED", "MANUAL_REVIEW_REQUIRED"]);
    expect(JSON.parse(redis.getString(`task:${task.id}`) ?? "{}")).toEqual(
      ambiguousTask
    );
    expect(redis.sortedMembers("queue:tasks")).toEqual([]);
  });

  it("rejects an unsafe creation marker even if the failure code is generic", async () => {
    const redis = new RedisLuaFixture();
    const ambiguousTask = {
      id: task.id,
      status: "failed",
      priority: "normal",
      attemptCount: 1,
      failureCode: "processing_failed",
      providerInvocations: {
        restoring: {
          status: "provider_creation_started",
          modelKey: "restoration",
          updatedAt: "2026-09-15T00:00:00.000Z",
        },
      },
    };
    redis.setString(`task:${task.id}`, JSON.stringify(ambiguousTask));

    await expect(
      redis.eval(
        TASK_RETRY_SCRIPT,
        [`task:${task.id}`, "queue:tasks"],
        ["1234", task.id]
      )
    ).resolves.toEqual(["REJECTED", "MANUAL_REVIEW_REQUIRED"]);
    expect(redis.sortedMembers("queue:tasks")).toEqual([]);
  });

  it("allows retry after a definitive create rejection", async () => {
    const redis = new RedisLuaFixture();
    redis.setString(
      `task:${task.id}`,
      JSON.stringify({
        id: task.id,
        status: "failed",
        priority: "normal",
        attemptCount: 1,
        failureCode: "provider_config",
        providerCreationDefinitivelyRejected: true,
        providerInvocations: {
          restoring: {
            status: "provider_creation_started",
            modelKey: "restoration",
            updatedAt: "2026-09-15T00:00:00.000Z",
          },
        },
      })
    );

    await expect(
      redis.eval(
        TASK_RETRY_SCRIPT,
        [`task:${task.id}`, "queue:tasks"],
        ["1234", task.id]
      )
    ).resolves.toEqual(["RETRIED", "2"]);
    expect(redis.sortedMembers("queue:tasks")).toEqual([task.id]);
  });
});

import type { Task } from "@/types";
import { readFileSync } from "node:fs";
import path from "node:path";

const mockClaimNextTask = jest.fn();
const mockSettleTaskClaim = jest.fn();
const mockGetQueueLength = jest.fn();
const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
const mockRefreshLock = jest.fn();
const mockExecutePipeline = jest.fn();
const mockGetTask = jest.fn();
const mockAfterCallbacks: Array<() => unknown | Promise<unknown>> = [];
const mockAfter = jest.fn((callback: () => unknown | Promise<unknown>) => {
  mockAfterCallbacks.push(callback);
});
const originalFetch = global.fetch;
const originalCronSecret = process.env.CRON_SECRET;

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (callback: () => unknown | Promise<unknown>) => mockAfter(callback),
}));

jest.mock("@/lib/config", () => ({
  config: { worker: { secret: "worker-secret" } },
}));
jest.mock("@/lib/queue", () => ({
  claimNextTask: (...args: unknown[]) => mockClaimNextTask(...args),
  settleTaskClaim: (...args: unknown[]) => mockSettleTaskClaim(...args),
  getQueueLength: (...args: unknown[]) => mockGetQueueLength(...args),
}));
jest.mock("@/lib/lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
  releaseLock: (...args: unknown[]) => mockReleaseLock(...args),
  refreshLock: (...args: unknown[]) => mockRefreshLock(...args),
}));
jest.mock("@/lib/pipeline", () => ({
  executePipeline: (...args: unknown[]) => mockExecutePipeline(...args),
}));
jest.mock("@/lib/redis", () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
}));

import { GET, POST, maxDuration } from "@/app/api/worker/pipeline/route";

const claim = { taskId: "task-1", score: 1234, leaseMember: "claim-json" };
const lease = { key: "lock:task:task-1", token: "lock-token", ttlSeconds: 300 };
const task: Task = {
  id: "task-1",
  userId: "user-1",
  status: "queued",
  priority: "normal",
  originalImageKey: "tasks/task-1/original.jpg",
  restoredImageKey: null,
  colorizedImageKey: null,
  animationVideoKey: null,
  errorMessage: null,
  internalErrorMessage: null,
  failureStage: null,
  progress: 5,
  createdAt: "2026-09-15T00:00:00.000Z",
  completedAt: null,
};

function request(body?: Record<string, unknown>): Request {
  return new Request("http://localhost/api/worker/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer worker-secret",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function runAfterTasks(): Promise<void> {
  while (mockAfterCallbacks.length > 0) {
    const callback = mockAfterCallbacks.shift();
    await callback?.();
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAfterCallbacks.length = 0;
  mockClaimNextTask.mockResolvedValue(claim);
  mockSettleTaskClaim.mockResolvedValue("acknowledged");
  mockAcquireLock.mockResolvedValue(lease);
  mockReleaseLock.mockResolvedValue(undefined);
  mockRefreshLock.mockResolvedValue(true);
  mockExecutePipeline.mockResolvedValue(undefined);
  mockGetTask.mockResolvedValue(task);
  mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 0 });
  global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
});

afterAll(() => {
  global.fetch = originalFetch;
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

describe("pipeline worker claims", () => {
  it("returns a lock-conflicted claim without creating a self-chain hot loop", async () => {
    mockAcquireLock.mockResolvedValue(null);
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockClaimNextTask).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockExecutePipeline).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("settles the claim and releases the lock after an unexpected pipeline error", async () => {
    mockExecutePipeline.mockRejectedValue(new Error("unexpected worker failure"));
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockExecutePipeline).not.toHaveBeenCalled();

    await expect(runAfterTasks()).rejects.toThrow("unexpected worker failure");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/worker/pipeline",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("requeues and schedules a successor when lock acquisition throws", async () => {
    mockAcquireLock.mockRejectedValue(new Error("lock backend unavailable"));
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("lock backend unavailable");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockReleaseLock).not.toHaveBeenCalled();
    const recoveryBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body
    );
    expect(recoveryBody).toMatchObject({
      recoveryClaim: claim,
      recoveryAttempt: 1,
      notBefore: expect.any(Number),
    });
  });

  it("releases the lock and schedules a successor when settlement throws", async () => {
    mockSettleTaskClaim.mockRejectedValue(new Error("settlement unavailable"));
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("settlement unavailable");

    expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    expect(global.fetch).toHaveBeenCalled();
  });

  it("schedules a successor when lock release throws", async () => {
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockReleaseLock.mockRejectedValue(new Error("release unavailable"));
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("release unavailable");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    const recoveryBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body
    );
    expect(recoveryBody).toMatchObject({
      recoveryClaim: claim,
      recoveryLease: lease,
      recoveryAttempt: 1,
      notBefore: expect.any(Number),
    });
  });

  it("retries a rejected self-chain request inside the registered lifecycle task", async () => {
    jest.useFakeTimers();
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("first dispatch failed"))
      .mockRejectedValueOnce(new Error("second dispatch failed"))
      .mockResolvedValue(new Response(null, { status: 200 }));

    try {
      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(mockAfter).toHaveBeenCalledTimes(1);
      expect(global.fetch).not.toHaveBeenCalled();

      const lifecycleWork = runAfterTasks();
      await jest.advanceTimersByTimeAsync(5_000);
      await lifecycleWork;

      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it("caps recovery retries across successor requests and preserves recovery state", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    mockExecutePipeline.mockRejectedValue(new Error("persistent pipeline failure"));
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    try {
      let recovery: Record<string, unknown> | undefined;

      for (let expectedAttempt = 1; expectedAttempt <= 3; expectedAttempt++) {
        const response = await POST(request(recovery));
        expect(response.status).toBe(200);
        await expect(runAfterTasks()).rejects.toThrow("persistent pipeline failure");

        const fetchMock = global.fetch as jest.Mock;
        const latestCall = fetchMock.mock.calls.at(-1);
        expect(latestCall).toBeDefined();
        recovery = JSON.parse(latestCall[1].body) as Record<string, unknown>;
        expect(recovery).toMatchObject({
          recoveryAttempt: expectedAttempt,
          recoveryClaim: claim,
          recoveryLease: lease,
        });
        expect(recovery.notBefore).toEqual(expect.any(Number));

        const deferred = await POST(request(recovery));
        expect(deferred.status).toBe(202);
        expect(mockAfterCallbacks).toHaveLength(0);
        now.mockReturnValue(recovery.notBefore as number);
      }

      const finalResponse = await POST(request(recovery));
      expect(finalResponse.status).toBe(200);
      await expect(runAfterTasks()).rejects.toThrow("persistent pipeline failure");
      expect(global.fetch).toHaveBeenCalledTimes(3);
    } finally {
      now.mockRestore();
    }
  });

  it("has an authenticated cron fallback that can recover queued work", async () => {
    process.env.CRON_SECRET = "cron-secret";
    const deployment = JSON.parse(
      readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8")
    ) as { crons?: Array<{ path: string; schedule: string }> };

    expect(deployment.crons).toContainEqual({
      path: "/api/worker/pipeline",
      schedule: "17 2 * * *",
    });
    expect(deployment.crons).not.toContainEqual(
      expect.objectContaining({
        path: "/api/worker/pipeline",
        schedule: expect.stringContaining("*/5"),
      })
    );
    expect(maxDuration).toBe(300);

    const response = await GET(
      new Request("http://localhost/api/worker/pipeline", {
        headers: { Authorization: "Bearer cron-secret" },
      })
    );

    expect(response.status).toBe(200);
    expect(mockExecutePipeline).not.toHaveBeenCalled();

    await runAfterTasks();

    expect(mockExecutePipeline).toHaveBeenCalledWith("task-1");
  });

  it("settles a predecessor recovery claim before claiming new work", async () => {
    const predecessor = {
      taskId: "task-prior",
      score: 1200,
      leaseMember: "prior-claim-json",
    };
    const predecessorLease = {
      key: "lock:task:task-prior",
      token: "prior-lock-token",
      ttlSeconds: 300,
    };

    const response = await POST(
      request({ recoveryClaim: predecessor, recoveryLease: predecessorLease })
    );

    expect(response.status).toBe(200);
    await runAfterTasks();
    expect(mockSettleTaskClaim).toHaveBeenNthCalledWith(1, predecessor);
    expect(mockSettleTaskClaim).toHaveBeenNthCalledWith(2, claim);
    expect(mockReleaseLock).toHaveBeenNthCalledWith(1, predecessorLease);
    expect(mockReleaseLock).toHaveBeenNthCalledWith(2, lease);
    expect(mockSettleTaskClaim.mock.invocationCallOrder[0]).toBeLessThan(
      mockClaimNextTask.mock.invocationCallOrder[0]
    );
    expect(mockReleaseLock.mock.invocationCallOrder[0]).toBeLessThan(
      mockClaimNextTask.mock.invocationCallOrder[0]
    );
  });

  it.each(["completed", "failed", "cancelled"] as const)(
    "acknowledges an already %s task without executing it again",
    async (status) => {
      mockGetTask.mockResolvedValue({ ...task, status });

      const response = await POST(request());

      expect(response.status).toBe(200);
      await runAfterTasks();
      expect(mockExecutePipeline).not.toHaveBeenCalled();
      expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
      expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    }
  );
});

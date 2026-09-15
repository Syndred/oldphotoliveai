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
const mockRedisSet = jest.fn();
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
  getRedisClient: () => ({ set: mockRedisSet }),
}));

import { GET, POST, maxDuration } from "@/app/api/worker/pipeline/route";
import { requestPipelineWakeupForStatus } from "@/lib/worker-wakeup";

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

function request(): Request {
  return new Request("http://localhost/api/worker/pipeline", {
    method: "POST",
    headers: {
      Authorization: "Bearer worker-secret",
    },
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
  mockRedisSet.mockResolvedValue("OK");
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
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("requeues and stops when lock acquisition throws", async () => {
    mockAcquireLock.mockRejectedValue(new Error("lock backend unavailable"));
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("lock backend unavailable");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockReleaseLock).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("releases the lock and stops when settlement throws", async () => {
    mockSettleTaskClaim.mockRejectedValue(new Error("settlement unavailable"));
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("settlement unavailable");

    expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stops when lock release throws", async () => {
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockReleaseLock.mockRejectedValue(new Error("release unavailable"));
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockAfter).toHaveBeenCalledTimes(1);
    await expect(runAfterTasks()).rejects.toThrow("release unavailable");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(global.fetch).not.toHaveBeenCalled();
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

  it("waits for observers to recover a failed settlement after its lease expires", async () => {
    mockClaimNextTask
      .mockResolvedValueOnce(claim)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(claim);
    mockAcquireLock
      .mockRejectedValueOnce(new Error("lock backend unavailable"))
      .mockResolvedValueOnce(lease);
    mockSettleTaskClaim
      .mockRejectedValueOnce(new Error("settlement unavailable"))
      .mockResolvedValueOnce("acknowledged");
    global.fetch = jest.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      POST(
        new Request("http://localhost/api/worker/pipeline", {
          method: "POST",
          headers: init?.headers,
        })
      )
    );

    await POST(request());
    await expect(runAfterTasks()).rejects.toThrow("lock backend unavailable");
    expect(global.fetch).not.toHaveBeenCalled();

    // An observer wake before the processing lease expires finds no ready claim.
    await requestPipelineWakeupForStatus("queued");
    await runAfterTasks();
    expect(mockExecutePipeline).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // After the throttle and processing leases expire, another observation
    // lets claimNextTask recover the unfinished claim.
    await requestPipelineWakeupForStatus("queued");
    await runAfterTasks();
    expect(mockExecutePipeline).toHaveBeenCalledTimes(1);
    expect(mockExecutePipeline).toHaveBeenCalledWith("task-1");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the daily cron to recover an expired claim when nobody observes it", async () => {
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

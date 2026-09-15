import type { Task } from "@/types";

const mockClaimNextTask = jest.fn();
const mockSettleTaskClaim = jest.fn();
const mockGetQueueLength = jest.fn();
const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
const mockRefreshLock = jest.fn();
const mockExecutePipeline = jest.fn();
const mockGetTask = jest.fn();
const originalFetch = global.fetch;

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

import { POST } from "@/app/api/worker/pipeline/route";

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
    headers: { Authorization: "Bearer worker-secret" },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
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
});

describe("pipeline worker claims", () => {
  it("returns a claim to the queue when another worker owns the task lock", async () => {
    mockAcquireLock.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockExecutePipeline).not.toHaveBeenCalled();
  });

  it("settles the claim and releases the lock after an unexpected pipeline error", async () => {
    mockExecutePipeline.mockRejectedValue(new Error("unexpected worker failure"));
    mockSettleTaskClaim.mockResolvedValue("requeued");
    mockGetQueueLength.mockResolvedValue({ urgent: 0, high: 0, normal: 1 });

    await expect(POST(request())).rejects.toThrow("unexpected worker failure");

    expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
    expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/worker/pipeline",
      expect.objectContaining({ method: "POST" })
    );
  });

  it.each(["completed", "failed", "cancelled"] as const)(
    "acknowledges an already %s task without executing it again",
    async (status) => {
      mockGetTask.mockResolvedValue({ ...task, status });

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(mockExecutePipeline).not.toHaveBeenCalled();
      expect(mockSettleTaskClaim).toHaveBeenCalledWith(claim);
      expect(mockReleaseLock).toHaveBeenCalledWith(lease);
    }
  );
});

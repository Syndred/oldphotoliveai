import { NextRequest } from "next/server";
import type { Task } from "@/types";

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockGetTask = jest.fn<Promise<Task | null>, [string]>();
const mockCancelTask = jest.fn<Promise<boolean>, [string]>();
const mockRetryTask = jest.fn<Promise<Task>, [string]>();

jest.mock("@/lib/redis", () => ({
  getTask: (...args: unknown[]) => mockGetTask(args[0] as string),
  cancelTask: (...args: unknown[]) => mockCancelTask(args[0] as string),
  retryTask: (...args: unknown[]) => mockRetryTask(args[0] as string),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
  },
}));

const mockEnqueueTask = jest.fn<Promise<void>, [string, string]>();
jest.mock("@/lib/queue", () => ({
  enqueueTask: (...args: unknown[]) => mockEnqueueTask(args[0] as string, args[1] as string),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { GET as getStatus } from "@/app/api/tasks/[taskId]/status/route";
import { POST as cancelRoute } from "@/app/api/tasks/[taskId]/cancel/route";
import { POST as retryRoute } from "@/app/api/tasks/[taskId]/retry/route";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-001",
    userId: "user-001",
    status: "pending",
    priority: "normal",
    originalImageKey: "uploads/photo.jpg",
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    progress: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function makeGetRequest(taskId: string): NextRequest {
  return new NextRequest(`http://localhost/api/tasks/${taskId}/status`, {
    method: "GET",
  });
}

function makePostRequest(taskId: string, path: string): NextRequest {
  return new NextRequest(`http://localhost/api/tasks/${taskId}/${path}`, {
    method: "POST",
  });
}

const routeParams = (taskId: string) => ({ params: { taskId } });

// ── Reset ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetTask.mockReset();
  mockCancelTask.mockReset();
  mockRetryTask.mockReset();
  mockEnqueueTask.mockReset();
});

// ============================================================
// Task Status API (GET /api/tasks/[taskId]/status)
// ============================================================

describe("GET /api/tasks/[taskId]/status", () => {
  it("returns 404 when task not found", async () => {
    mockGetTask.mockResolvedValue(null);

    const req = makeGetRequest("nonexistent");
    const res = await getStatus(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("returns status and progress for pending task", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "pending", progress: 0 }));

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("pending");
    expect(body.progress).toBe(0);
    expect(body.errorMessage).toBeUndefined();
    expect(body.restoredImageKey).toBeUndefined();
  });

  it("returns result keys for completed task", async () => {
    mockGetTask.mockResolvedValue(
      makeFakeTask({
        status: "completed",
        progress: 100,
        restoredImageKey: "results/restored.jpg",
        colorizedImageKey: "results/colorized.jpg",
        animationVideoKey: "results/animation.mp4",
      })
    );

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("completed");
    expect(body.progress).toBe(100);
    expect(body.restoredImageKey).toBe("results/restored.jpg");
    expect(body.colorizedImageKey).toBe("results/colorized.jpg");
    expect(body.animationVideoKey).toBe("results/animation.mp4");
  });

  it("returns errorMessage for failed task", async () => {
    mockGetTask.mockResolvedValue(
      makeFakeTask({
        status: "failed",
        progress: 25,
        errorMessage: "GFPGAN model timeout",
      })
    );

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("failed");
    expect(body.progress).toBe(25);
    expect(body.errorMessage).toBe("GFPGAN model timeout");
  });

  it("returns 500 when getTask throws", async () => {
    mockGetTask.mockRejectedValue(new Error("Redis error"));

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Task not found");
  });
});

// ============================================================
// Task Cancel API (POST /api/tasks/[taskId]/cancel)
// ============================================================

describe("POST /api/tasks/[taskId]/cancel", () => {
  it("returns 404 when task not found", async () => {
    mockGetTask.mockResolvedValue(null);

    const req = makePostRequest("nonexistent", "cancel");
    const res = await cancelRoute(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("cancels a pending task successfully", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "pending" }));
    mockCancelTask.mockResolvedValue(true);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Task cancelled successfully");
    expect(mockCancelTask).toHaveBeenCalledWith("task-001");
  });

  it("cancels a queued task successfully", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "queued", progress: 5 }));
    mockCancelTask.mockResolvedValue(true);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Task cancelled successfully");
  });

  it("returns 400 when task is in restoring status", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "restoring" }));
    mockCancelTask.mockResolvedValue(false);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("This task cannot be cancelled");
  });

  it("returns 400 when task is completed", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "completed" }));
    mockCancelTask.mockResolvedValue(false);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("This task cannot be cancelled");
  });

  it("returns 400 when task is already failed", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "failed" }));
    mockCancelTask.mockResolvedValue(false);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("This task cannot be cancelled");
  });

  it("returns 500 when cancelTask throws", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "pending" }));
    mockCancelTask.mockRejectedValue(new Error("Redis error"));

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("This task cannot be cancelled");
  });
});

// ============================================================
// Task Retry API (POST /api/tasks/[taskId]/retry)
// ============================================================

describe("POST /api/tasks/[taskId]/retry", () => {
  it("returns 404 when task not found", async () => {
    mockGetTask.mockResolvedValue(null);

    const req = makePostRequest("nonexistent", "retry");
    const res = await retryRoute(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("retries a failed task successfully", async () => {
    mockGetTask.mockResolvedValue(
      makeFakeTask({ status: "failed", errorMessage: "Model timeout" })
    );
    const retriedTask = makeFakeTask({
      status: "queued",
      progress: 5,
      errorMessage: null,
    });
    mockRetryTask.mockResolvedValue(retriedTask);

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Task queued for retry");
    expect(body.task.status).toBe("queued");
    expect(body.task.progress).toBe(5);
    expect(mockRetryTask).toHaveBeenCalledWith("task-001");
  });

  it("returns 400 when task is pending", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "pending" }));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Retry failed");
  });

  it("returns 400 when task is completed", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "completed" }));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Retry failed");
  });

  it("returns 400 when task is restoring", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "restoring" }));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Retry failed");
  });

  it("returns 400 when task is cancelled", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "cancelled" }));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Retry failed");
  });

  it("returns 500 when retryTask throws", async () => {
    mockGetTask.mockResolvedValue(makeFakeTask({ status: "failed" }));
    mockRetryTask.mockRejectedValue(new Error("Redis error"));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Retry failed");
  });
});

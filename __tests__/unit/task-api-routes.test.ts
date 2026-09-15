import { NextRequest } from "next/server";
import type { Task } from "@/types";

const mockGetTaskOwnedByUser = jest.fn<Promise<Task | null>, [string, string]>();
const mockGetAnonymousTaskOwnedByVisitor = jest.fn();
const mockCancelTask = jest.fn<Promise<boolean>, [string]>();
const mockRetryTaskAtomic = jest.fn();
const mockGetToken = jest.fn();

jest.mock("@/lib/redis", () => ({
  getTaskOwnedByUser: (...args: unknown[]) =>
    mockGetTaskOwnedByUser(args[0] as string, args[1] as string),
  cancelTask: (...args: unknown[]) => mockCancelTask(args[0] as string),
  getAnonymousTaskOwnedByVisitor: (...args: unknown[]) =>
    mockGetAnonymousTaskOwnedByVisitor(args[0], args[1]),
}));

jest.mock("@/lib/task-retry", () => ({
  retryTaskAtomic: (...args: unknown[]) => mockRetryTaskAtomic(args[0]),
}));

jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
  },
}));

const mockWorkerFetch = jest.fn().mockResolvedValue(undefined);
global.fetch = mockWorkerFetch as unknown as typeof fetch;

import { GET as getStatus } from "@/app/api/tasks/[taskId]/status/route";
import { POST as cancelRoute } from "@/app/api/tasks/[taskId]/cancel/route";
import { POST as retryRoute } from "@/app/api/tasks/[taskId]/retry/route";

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
    internalErrorMessage: null,
    failureStage: null,
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

function makePostRequest(taskId: string, path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost/api/tasks/${taskId}/${path}`, {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

const routeParams = (taskId: string) => ({
  params: Promise.resolve({ taskId }),
});

beforeEach(() => {
  mockGetTaskOwnedByUser.mockReset();
  mockCancelTask.mockReset();
  mockRetryTaskAtomic.mockReset();
  mockGetAnonymousTaskOwnedByVisitor.mockReset().mockResolvedValue(null);
  mockGetToken.mockReset();
  mockWorkerFetch.mockReset().mockResolvedValue(undefined);

  mockGetToken.mockResolvedValue({ userId: "user-001" });
});

describe("GET /api/tasks/[taskId]/status", () => {
  it("returns 404 when unauthenticated and no anonymous trial owns the task", async () => {
    mockGetToken.mockResolvedValue(null);

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("returns 404 when task not found", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(null);

    const req = makeGetRequest("nonexistent");
    const res = await getStatus(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("returns status and progress for pending task", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(
      makeFakeTask({ status: "pending", progress: 0 })
    );

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
    mockGetTaskOwnedByUser.mockResolvedValue(
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
    mockGetTaskOwnedByUser.mockResolvedValue(
      makeFakeTask({
        status: "failed",
        progress: 25,
        errorMessage: "GFPGAN model timeout",
        internalErrorMessage: "429 throttled",
        failureStage: "animating",
        failureCode: "service_busy",
        attemptCount: 2,
      })
    );

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("failed");
    expect(body.progress).toBe(25);
    expect(body.errorMessage).toBe("GFPGAN model timeout");
    expect(body.internalErrorMessage).toBeUndefined();
    expect(body.failureStage).toBe("animating");
    expect(body.failureCode).toBe("service_busy");
    expect(body.attemptCount).toBe(2);
    expect(body.retryAllowed).toBe(true);
  });

  it("does not offer retry for a content-policy failure", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(
      makeFakeTask({
        status: "failed",
        failureCode: "content_rejected",
        failureStage: "restoring",
        violation: true,
      })
    );

    const res = await getStatus(makeGetRequest("task-001"), routeParams("task-001"));
    const body = await res.json();

    expect(body.retryAllowed).toBe(false);
    expect(body.failureCode).toBe("content_rejected");
    expect(body.violation).toBeUndefined();
  });

  it("returns 500 when task lookup throws", async () => {
    mockGetTaskOwnedByUser.mockRejectedValue(new Error("Redis error"));

    const req = makeGetRequest("task-001");
    const res = await getStatus(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Task not found");
  });
});

describe("POST /api/tasks/[taskId]/cancel", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetToken.mockResolvedValue(null);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("returns 404 when task not found", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(null);

    const req = makePostRequest("nonexistent", "cancel");
    const res = await cancelRoute(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("cancels a pending task successfully", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(makeFakeTask({ status: "pending" }));
    mockCancelTask.mockResolvedValue(true);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Task cancelled successfully");
    expect(mockCancelTask).toHaveBeenCalledWith("task-001");
  });

  it("returns 400 when task cannot be cancelled", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(makeFakeTask({ status: "restoring" }));
    mockCancelTask.mockResolvedValue(false);

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("This task cannot be cancelled");
  });

  it("returns 500 when cancelTask throws", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(makeFakeTask({ status: "pending" }));
    mockCancelTask.mockRejectedValue(new Error("Redis error"));

    const req = makePostRequest("task-001", "cancel");
    const res = await cancelRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("This task cannot be cancelled");
  });
});

describe("POST /api/tasks/[taskId]/retry", () => {
  it("returns 404 when unauthenticated and not an anonymous owner", async () => {
    mockGetToken.mockResolvedValue(null);

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("returns 404 when task not found", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(null);

    const req = makePostRequest("nonexistent", "retry");
    const res = await retryRoute(req, routeParams("nonexistent"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("retries a failed task successfully", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(
      makeFakeTask({ status: "failed", errorMessage: "Model timeout" })
    );
    const retriedTask = makeFakeTask({
      status: "queued",
      progress: 5,
      errorMessage: null,
    });
    mockRetryTaskAtomic.mockResolvedValue({ outcome: "retried", attemptCount: 2 });

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Task queued for retry");
    expect(body.task.status).toBe("queued");
    expect(body.task.progress).toBe(5);
    expect(mockRetryTaskAtomic).toHaveBeenCalledWith(expect.objectContaining({ id: "task-001" }));
    expect(body.task.attemptCount).toBe(2);
    expect(mockWorkerFetch).toHaveBeenCalledTimes(1);
  });

  it("retries an anonymously owned technical failure without charging again", async () => {
    mockGetToken.mockResolvedValue(null);
    mockGetAnonymousTaskOwnedByVisitor.mockResolvedValue(
      makeFakeTask({
        userId: "anonymous:visitor-001",
        status: "failed",
        failureCode: "service_busy",
      })
    );
    mockRetryTaskAtomic.mockResolvedValue({ outcome: "retried", attemptCount: 2 });

    const req = makePostRequest(
      "task-001",
      "retry",
      "opla_anon_visitor=visitor-001"
    );
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.task).toMatchObject({ accessMode: "anonymous", attemptCount: 2 });
  });

  it("returns 400 when task is not failed", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(makeFakeTask({ status: "pending" }));
    mockRetryTaskAtomic.mockResolvedValue({ outcome: "rejected", code: "NOT_FAILED" });

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Retry failed");
  });

  it("returns 500 when retryTask throws", async () => {
    mockGetTaskOwnedByUser.mockResolvedValue(makeFakeTask({ status: "failed" }));
    mockRetryTaskAtomic.mockRejectedValue(new Error("Redis error"));

    const req = makePostRequest("task-001", "retry");
    const res = await retryRoute(req, routeParams("task-001"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Retry failed");
  });
});

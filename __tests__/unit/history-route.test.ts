import { NextRequest } from "next/server";
import type { Task } from "@/types";

const mockGetToken = jest.fn();
jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

const mockGetUserTasks = jest.fn<Promise<Task[]>, [string]>();
const mockDeleteTask = jest.fn<Promise<boolean>, [string, string]>();
const mockGetTaskOwnedByUser = jest.fn<Promise<Task | null>, [string, string]>();

jest.mock("@/lib/redis", () => ({
  getUserTasks: (...args: unknown[]) => mockGetUserTasks(args[0] as string),
  deleteTask: (...args: unknown[]) => mockDeleteTask(args[0] as string, args[1] as string),
  getTaskOwnedByUser: (...args: unknown[]) =>
    mockGetTaskOwnedByUser(args[0] as string, args[1] as string),
}));

const mockDeleteTaskFiles = jest.fn<Promise<void>, [string, Array<string | null | undefined>]>();

jest.mock("@/lib/r2", () => ({
  getR2CdnUrl: (key: string) => `https://cdn.example.com/${key}`,
  deleteTaskFiles: (...args: unknown[]) =>
    mockDeleteTaskFiles(
      args[0] as string,
      (args[1] as Array<string | null | undefined>) ?? []
    ),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
    r2: { publicDomain: "cdn.example.com" },
  },
}));

import { GET, DELETE } from "@/app/api/history/route";

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-001",
    userId: "user-001",
    status: "completed",
    priority: "normal",
    originalImageKey: "uploads/photo.jpg",
    restoredImageKey: "results/restored.jpg",
    colorizedImageKey: "results/colorized.jpg",
    animationVideoKey: "results/animation.mp4",
    errorMessage: null,
    internalErrorMessage: null,
    failureStage: null,
    progress: 100,
    createdAt: "2024-01-02T00:00:00.000Z",
    completedAt: "2024-01-02T00:05:00.000Z",
    ...overrides,
  };
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/history", { method: "GET" });
}

function makeDeleteRequest(taskIds: string[] | unknown): NextRequest {
  return new NextRequest("http://localhost/api/history", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds }),
  });
}

function makeMalformedDeleteRequest(raw: string): NextRequest {
  return new NextRequest("http://localhost/api/history", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
}

beforeEach(() => {
  mockGetToken.mockReset();
  mockGetUserTasks.mockReset();
  mockDeleteTask.mockReset();
  mockGetTaskOwnedByUser.mockReset();
  mockDeleteTaskFiles.mockReset();
});

describe("GET /api/history", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetToken.mockResolvedValue(null);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("returns empty tasks array when user has no tasks", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tasks).toEqual([]);
    expect(mockGetUserTasks).toHaveBeenCalledWith("user-001");
  });

  it("returns mapped tasks with thumbnailUrl", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([makeFakeTask()]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tasks[0]).toEqual({
      id: "task-001",
      status: "completed",
      progress: 100,
      createdAt: "2024-01-02T00:00:00.000Z",
      completedAt: "2024-01-02T00:05:00.000Z",
      thumbnailUrl: "https://cdn.example.com/uploads/photo.jpg",
      errorMessage: null,
    });
  });
});

describe("DELETE /api/history", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetToken.mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest(["task-001"]));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("returns 400 when taskIds is invalid", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });

    const res = await DELETE(makeDeleteRequest("task-001"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Please select at least one task.");
  });

  it("returns 400 when DELETE body is malformed JSON", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });

    const res = await DELETE(makeMalformedDeleteRequest("{bad json"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Please select at least one task.");
  });

  it("verifies ownership before deleting files", async () => {
    const task = makeFakeTask();
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetTaskOwnedByUser.mockResolvedValue(task);
    mockDeleteTask.mockResolvedValue(true);
    mockDeleteTaskFiles.mockResolvedValue(undefined);

    const res = await DELETE(makeDeleteRequest(["task-001"]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockGetTaskOwnedByUser).toHaveBeenCalledWith("task-001", "user-001");
    expect(mockDeleteTaskFiles).toHaveBeenCalledWith("task-001", [
      task.originalImageKey,
      task.restoredImageKey,
      task.colorizedImageKey,
      task.animationVideoKey,
    ]);
    expect(mockDeleteTask).toHaveBeenCalledWith("task-001", "user-001");
    expect(body.results).toEqual([{ id: "task-001", deleted: true }]);
  });

  it("does not delete files when ownership check fails", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetTaskOwnedByUser.mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest(["task-999"]));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockDeleteTaskFiles).not.toHaveBeenCalled();
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(body.results).toEqual([{ id: "task-999", deleted: false }]);
  });
});

import { NextRequest } from "next/server";
import type { Task } from "@/types";

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockGetToken = jest.fn();
jest.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => mockGetToken(...args),
}));

const mockGetUserTasks = jest.fn<Promise<Task[]>, [string]>();
jest.mock("@/lib/redis", () => ({
  getUserTasks: (...args: unknown[]) => mockGetUserTasks(args[0] as string),
}));

jest.mock("@/lib/r2", () => ({
  getR2CdnUrl: (key: string) => `https://cdn.example.com/${key}`,
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
    r2: { publicDomain: "cdn.example.com" },
  },
}));

// ── Import after mocks ─────────────────────────────────────────────────────

import { GET } from "@/app/api/history/route";

// ── Helpers ─────────────────────────────────────────────────────────────────

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
    progress: 100,
    createdAt: "2024-01-02T00:00:00.000Z",
    completedAt: "2024-01-02T00:05:00.000Z",
    ...overrides,
  };
}

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/history", { method: "GET" });
}

// ── Reset ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetToken.mockReset();
  mockGetUserTasks.mockReset();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/history", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetToken.mockResolvedValue(null);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("returns 401 when token has no userId", async () => {
    mockGetToken.mockResolvedValue({ email: "test@example.com" });

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

  it("returns mapped tasks with thumbnailUrl for completed task", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([makeFakeTask()]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.tasks).toHaveLength(1);
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

  it("returns errorMessage only for failed tasks", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([
      makeFakeTask({
        id: "task-002",
        status: "failed",
        progress: 25,
        errorMessage: "GFPGAN timeout",
        completedAt: null,
      }),
    ]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(body.tasks[0].errorMessage).toBe("GFPGAN timeout");
    expect(body.tasks[0].status).toBe("failed");
  });

  it("returns null errorMessage for non-failed tasks", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([
      makeFakeTask({ status: "restoring", progress: 25 }),
    ]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(body.tasks[0].errorMessage).toBeNull();
  });

  it("returns tasks sorted by createdAt descending (newest first)", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([
      makeFakeTask({ id: "task-new", createdAt: "2024-01-03T00:00:00.000Z" }),
      makeFakeTask({ id: "task-old", createdAt: "2024-01-01T00:00:00.000Z" }),
    ]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(body.tasks[0].id).toBe("task-new");
    expect(body.tasks[1].id).toBe("task-old");
  });

  it("returns null thumbnailUrl when originalImageKey is missing", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([
      makeFakeTask({ originalImageKey: "" }),
    ]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(body.tasks[0].thumbnailUrl).toBeNull();
  });

  it("returns 500 when getUserTasks throws", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockRejectedValue(new Error("Redis error"));

    const res = await GET(makeGetRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to load history");
  });

  it("does not expose internal task fields like restoredImageKey", async () => {
    mockGetToken.mockResolvedValue({ userId: "user-001" });
    mockGetUserTasks.mockResolvedValue([makeFakeTask()]);

    const res = await GET(makeGetRequest());
    const body = await res.json();

    const task = body.tasks[0];
    expect(task.restoredImageKey).toBeUndefined();
    expect(task.colorizedImageKey).toBeUndefined();
    expect(task.animationVideoKey).toBeUndefined();
    expect(task.originalImageKey).toBeUndefined();
    expect(task.userId).toBeUndefined();
    expect(task.priority).toBeUndefined();
  });
});

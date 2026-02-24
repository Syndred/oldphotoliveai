import { POST } from "@/app/api/tasks/route";
import { NextRequest } from "next/server";
import type { User, Task } from "@/types";

// ── Mock dependencies ───────────────────────────────────────────────────────

const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockCreateTask = jest.fn<Promise<Task>, [{ userId: string; originalImageKey: string; priority: string }]>();

jest.mock("@/lib/redis", () => ({
  getUser: (...args: unknown[]) => mockGetUser(args[0] as string),
  createTask: (...args: unknown[]) => mockCreateTask(args[0] as { userId: string; originalImageKey: string; priority: string }),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeFakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-user-001",
    googleId: "google-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
    tier: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-uuid-123",
    userId: "test-user-001",
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

// ── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetUser.mockReset();
  mockCreateTask.mockReset();
});

describe("POST /api/tasks", () => {
  it("returns 400 when imageKey is missing", async () => {
    const req = createJsonRequest({});
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 400 when imageKey is empty string", async () => {
    const req = createJsonRequest({ imageKey: "" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 400 when imageKey is whitespace only", async () => {
    const req = createJsonRequest({ imageKey: "   " });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 400 when imageKey is not a string", async () => {
    const req = createJsonRequest({ imageKey: 123 });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 404 when user is not found", async () => {
    mockGetUser.mockResolvedValue(null);

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg", userId: "nonexistent" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Please sign in to continue");
  });

  it("creates task with normal priority for free user", async () => {
    const user = makeFakeUser({ tier: "free" });
    const task = makeFakeTask({ priority: "normal" });
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockResolvedValue(task);

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg", userId: "test-user-001" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.taskId).toBe("task-uuid-123");
    expect(mockCreateTask).toHaveBeenCalledWith({
      userId: "test-user-001",
      originalImageKey: "uploads/photo.jpg",
      priority: "normal",
    });
  });

  it("creates task with high priority for pay_as_you_go user", async () => {
    const user = makeFakeUser({ id: "paid-user", tier: "pay_as_you_go" });
    const task = makeFakeTask({ id: "task-paid", priority: "high" });
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockResolvedValue(task);

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg", userId: "paid-user" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.taskId).toBe("task-paid");
    expect(mockCreateTask).toHaveBeenCalledWith({
      userId: "paid-user",
      originalImageKey: "uploads/photo.jpg",
      priority: "high",
    });
  });

  it("creates task with high priority for professional user", async () => {
    const user = makeFakeUser({ id: "pro-user", tier: "professional" });
    const task = makeFakeTask({ id: "task-pro", priority: "high" });
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockResolvedValue(task);

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg", userId: "pro-user" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(mockCreateTask).toHaveBeenCalledWith({
      userId: "pro-user",
      originalImageKey: "uploads/photo.jpg",
      priority: "high",
    });
  });

  it("uses default test user ID when userId is not provided", async () => {
    const user = makeFakeUser({ id: "test-user-001" });
    const task = makeFakeTask();
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockResolvedValue(task);

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(mockGetUser).toHaveBeenCalledWith("test-user-001");
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "test-user-001" })
    );
  });

  it("trims imageKey whitespace", async () => {
    const user = makeFakeUser();
    const task = makeFakeTask();
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockResolvedValue(task);

    const req = createJsonRequest({ imageKey: "  uploads/photo.jpg  " });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ originalImageKey: "uploads/photo.jpg" })
    );
  });

  it("returns 500 when createTask throws", async () => {
    const user = makeFakeUser();
    mockGetUser.mockResolvedValue(user);
    mockCreateTask.mockRejectedValue(new Error("Redis connection error"));

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create task");
  });

  it("returns 500 when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("Redis timeout"));

    const req = createJsonRequest({ imageKey: "uploads/photo.jpg", userId: "user-1" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Failed to create task");
  });
});
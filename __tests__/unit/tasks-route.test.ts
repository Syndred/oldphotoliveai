import { NextRequest } from "next/server";
import type { Task, User } from "@/types";

const mockGetToken = jest.fn();
const mockGetUser = jest.fn<Promise<User | null>, [string]>();
const mockCreateAuthenticatedTaskAtomic = jest.fn();

jest.mock("next-auth/jwt", () => ({ getToken: (...args: unknown[]) => mockGetToken(...args) }));
jest.mock("@/lib/redis", () => ({ getUser: (id: string) => mockGetUser(id) }));
jest.mock("@/lib/task-creation", () => ({
  createAuthenticatedTaskAtomic: (...args: unknown[]) => mockCreateAuthenticatedTaskAtomic(args[0]),
}));

const mockWorkerFetch = jest.fn().mockResolvedValue(undefined);
global.fetch = mockWorkerFetch as unknown as typeof fetch;

import { POST } from "@/app/api/tasks/route";

const user: User = {
  id: "user-1", googleId: "google-1", email: "person@example.com", name: "Person",
  avatarUrl: null, tier: "free", createdAt: "2026-09-15T00:00:00.000Z", updatedAt: "2026-09-15T00:00:00.000Z",
};
const task: Task = {
  id: "task-1", userId: user.id, status: "pending", priority: "normal", workflow: "full",
  originalImageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
  restoredImageKey: null, colorizedImageKey: null, animationVideoKey: null,
  errorMessage: null, internalErrorMessage: null, failureStage: null, progress: 0,
  createdAt: "2026-09-15T00:00:00.000Z", completedAt: null,
};

function makeRequest(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/tasks", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGetToken.mockReset().mockResolvedValue({ userId: user.id });
  mockGetUser.mockReset().mockResolvedValue(user);
  mockCreateAuthenticatedTaskAtomic.mockReset().mockResolvedValue({ outcome: "created", task, remaining: 0 });
  mockWorkerFetch.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/tasks", () => {
  it("requires authentication", async () => {
    mockGetToken.mockResolvedValue(null);
    expect((await POST(makeRequest({ imageKey: task.originalImageKey }))).status).toBe(401);
  });

  it.each([{}, { imageKey: "" }, { imageKey: "   " }, { imageKey: 123 }, { imageKey: "https://example.com/a.jpg" }])(
    "rejects invalid input %#", async (body) => {
      expect((await POST(makeRequest(body))).status).toBe(400);
      expect(mockCreateAuthenticatedTaskAtomic).not.toHaveBeenCalled();
    }
  );

  it("rejects malformed JSON", async () => {
    expect((await POST(makeRequest("{bad", true))).status).toBe(400);
  });

  it("creates a task with normalized input and workflow", async () => {
    const res = await POST(makeRequest({ imageKey: `  ${task.originalImageKey}  `, workflow: "colorize" }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ taskId: task.id, replayed: false, allowanceConsumed: true });
    expect(mockCreateAuthenticatedTaskAtomic).toHaveBeenCalledWith({
      user, imageKey: task.originalImageKey, workflow: "colorize",
    });
  });

  it("recovers a replay without consuming allowance", async () => {
    mockCreateAuthenticatedTaskAtomic.mockResolvedValue({ outcome: "existing", taskId: "task-existing", remaining: 0 });
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ taskId: "task-existing", replayed: true, allowanceConsumed: false });
  });

  it.each([
    ["DAILY_QUOTA_EXHAUSTED", "Daily free quota used up. Upgrade or try again tomorrow."],
    ["NO_CREDITS", "Credits have expired. Please purchase again."],
  ])("classifies %s as an expected refusal", async (code, message) => {
    mockCreateAuthenticatedTaskAtomic.mockResolvedValue({ outcome: "rejected", code, remaining: 0 });
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: message, code, stage: "authorization", allowanceConsumed: false });
  });

  it("does not expose raw technical errors", async () => {
    mockCreateAuthenticatedTaskAtomic.mockRejectedValue(new Error("redis token secret"));
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ code: "INTERNAL_ERROR", stage: "creation", allowanceConsumed: null });
    expect(JSON.stringify(body)).not.toContain("redis token secret");
  });
});

import { NextRequest } from "next/server";
import type { Task } from "@/types";

const mockCreateAnonymousTaskAtomic = jest.fn();
jest.mock("@/lib/task-creation", () => ({
  createAnonymousTaskAtomic: (...args: unknown[]) =>
    mockCreateAnonymousTaskAtomic(args[0]),
}));
jest.mock("uuid", () => ({ v4: () => "visitor-001" }));

const mockWorkerFetch = jest.fn().mockResolvedValue(undefined);
global.fetch = mockWorkerFetch as unknown as typeof fetch;

import { POST } from "@/app/api/anonymous-tasks/route";

const task: Task = {
  id: "task-anon-001",
  userId: "anonymous:visitor-001",
  status: "pending",
  priority: "normal",
  workflow: "animate",
  originalImageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
  restoredImageKey: null,
  colorizedImageKey: null,
  animationVideoKey: null,
  errorMessage: null,
  internalErrorMessage: null,
  failureStage: null,
  progress: 0,
  createdAt: "2026-09-15T00:00:00.000Z",
  completedAt: null,
};

function makeRequest(body: unknown, cookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/anonymous-tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCreateAnonymousTaskAtomic.mockReset().mockResolvedValue({ outcome: "created", task });
  mockWorkerFetch.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/anonymous-tasks", () => {
  it("creates one atomic no-login animation task and sets the visitor cookie", async () => {
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      taskId: task.id,
      accessMode: "anonymous",
      replayed: false,
      allowanceConsumed: true,
    });
    expect(res.headers.get("set-cookie")).toContain("opla_anon_visitor=visitor-001");
    expect(mockCreateAnonymousTaskAtomic).toHaveBeenCalledWith({
      visitorId: "visitor-001",
      imageKey: task.originalImageKey,
    });
  });

  it("recovers an existing task without consuming the trial again", async () => {
    mockCreateAnonymousTaskAtomic.mockResolvedValue({ outcome: "existing", taskId: "task-existing" });
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }, "opla_anon_visitor=visitor-001"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      taskId: "task-existing",
      replayed: true,
      allowanceConsumed: false,
    });
  });

  it("classifies a used trial as an expected refusal", async () => {
    mockCreateAnonymousTaskAtomic.mockResolvedValue({
      outcome: "rejected",
      code: "ANONYMOUS_TRIAL_USED",
      remaining: 0,
    });
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }, "opla_anon_visitor=visitor-001"));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({
      code: "ANONYMOUS_TRIAL_USED",
      stage: "authorization",
      allowanceConsumed: false,
    });
  });

  it("rejects unsafe keys before atomic creation", async () => {
    expect((await POST(makeRequest({ imageKey: "https://example.com/photo.jpg" }))).status).toBe(400);
    expect(mockCreateAnonymousTaskAtomic).not.toHaveBeenCalled();
  });

  it("does not expose raw technical errors", async () => {
    mockCreateAnonymousTaskAtomic.mockRejectedValue(new Error("redis token secret"));
    const res = await POST(makeRequest({ imageKey: task.originalImageKey }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ code: "INTERNAL_ERROR", stage: "creation", allowanceConsumed: null });
    expect(JSON.stringify(body)).not.toContain("redis token secret");
  });
});

import { NextRequest } from "next/server";
import type { Task, User } from "@/types";

const mockClaimAnonymousTrial = jest.fn<Promise<boolean>, [string]>();
const mockCreateOrGetAnonymousUser = jest.fn<Promise<User>, [string]>();
const mockCreateTask = jest.fn<Promise<Task>, [Record<string, unknown>]>();
const mockGetAnonymousTrialTaskId = jest.fn<Promise<string | null>, [string]>();
const mockRecordAnonymousTrialTask = jest.fn<Promise<void>, [string, string]>();
const mockEnqueueTask = jest.fn<Promise<void>, [string, string]>();

jest.mock("@/lib/redis", () => ({
  claimAnonymousTrial: (...args: unknown[]) =>
    mockClaimAnonymousTrial(args[0] as string),
  createOrGetAnonymousUser: (...args: unknown[]) =>
    mockCreateOrGetAnonymousUser(args[0] as string),
  createTask: (...args: unknown[]) =>
    mockCreateTask(args[0] as Record<string, unknown>),
  getAnonymousTrialTaskId: (...args: unknown[]) =>
    mockGetAnonymousTrialTaskId(args[0] as string),
  recordAnonymousTrialTask: (...args: unknown[]) =>
    mockRecordAnonymousTrialTask(args[0] as string, args[1] as string),
}));

jest.mock("@/lib/queue", () => ({
  enqueueTask: (...args: unknown[]) =>
    mockEnqueueTask(args[0] as string, args[1] as string),
}));

jest.mock("@/lib/config", () => ({
  config: {
    redis: { url: "https://test.upstash.io", token: "test-token" },
  },
}));

const mockWorkerFetch = jest.fn().mockResolvedValue(undefined);
global.fetch = mockWorkerFetch as unknown as typeof fetch;

import { POST } from "@/app/api/anonymous-tasks/route";

function makeFakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "anonymous:visitor-001",
    googleId: "anonymous:visitor-001",
    email: "visitor-001@anonymous.oldphotoliveai.local",
    name: "Anonymous visitor",
    avatarUrl: null,
    tier: "free",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
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
    createdAt: new Date().toISOString(),
    completedAt: null,
    ...overrides,
  };
}

function createJsonRequest(body: unknown, cookie?: string): NextRequest {
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
  mockClaimAnonymousTrial.mockReset();
  mockCreateOrGetAnonymousUser.mockReset();
  mockCreateTask.mockReset();
  mockGetAnonymousTrialTaskId.mockReset();
  mockRecordAnonymousTrialTask.mockReset();
  mockEnqueueTask.mockReset();
  mockWorkerFetch.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});

  mockGetAnonymousTrialTaskId.mockResolvedValue(null);
  mockClaimAnonymousTrial.mockResolvedValue(true);
  mockCreateOrGetAnonymousUser.mockResolvedValue(makeFakeUser());
  mockCreateTask.mockResolvedValue(makeFakeTask());
  mockRecordAnonymousTrialTask.mockResolvedValue(undefined);
  mockEnqueueTask.mockResolvedValue(undefined);
});

describe("POST /api/anonymous-tasks", () => {
  it("creates one no-login animation task and sets visitor cookie", async () => {
    const req = createJsonRequest({
      imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({
      taskId: "task-anon-001",
      accessMode: "anonymous",
      watermark: true,
      maxQuality: "480p",
    });
    expect(res.headers.get("set-cookie")).toContain("opla_anon_visitor=");
    expect(mockCreateTask).toHaveBeenCalledWith({
      userId: "anonymous:visitor-001",
      originalImageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      priority: "normal",
      workflow: "animate",
    });
    expect(mockEnqueueTask).toHaveBeenCalledWith("task-anon-001", "normal");
  });

  it("rejects a visitor that already used the no-login trial", async () => {
    mockGetAnonymousTrialTaskId.mockResolvedValue("task-existing");

    const req = createJsonRequest(
      {
        imageKey: "tasks/123e4567-e89b-12d3-a456-426614174000/original.jpg",
      },
      "opla_anon_visitor=visitor-001"
    );

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toMatchObject({
      code: "ANONYMOUS_TRIAL_USED",
      taskId: "task-existing",
    });
    expect(mockClaimAnonymousTrial).not.toHaveBeenCalled();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("rejects unsafe storage keys", async () => {
    const req = createJsonRequest({
      imageKey: "https://example.com/photo.jpg",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });
});

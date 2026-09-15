import { NextRequest } from "next/server";
import type { Task } from "@/types";

const mockAfter = jest.fn();
const mockGetAccessibleTask = jest.fn();
const mockRedisSet = jest.fn();
const originalFetch = global.fetch;

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (...args: unknown[]) => mockAfter(...args),
}));

jest.mock("@/lib/task-access", () => ({
  getAccessibleTask: (...args: unknown[]) => mockGetAccessibleTask(...args),
}));

jest.mock("@/lib/config", () => ({
  config: { worker: { secret: "worker-secret" } },
}));

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({ set: mockRedisSet }),
}));

import { GET } from "@/app/api/tasks/[taskId]/stream/route";

function task(status: Task["status"]): Task {
  return {
    id: "task-001",
    userId: "user-001",
    status,
    priority: "normal",
    originalImageKey: "uploads/photo.jpg",
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    internalErrorMessage: null,
    failureStage: null,
    progress: status === "completed" ? 100 : 5,
    createdAt: "2026-09-15T00:00:00.000Z",
    completedAt: status === "completed" ? "2026-09-15T00:01:00.000Z" : null,
  };
}

afterAll(() => {
  global.fetch = originalFetch;
});

it("awaits a throttled worker dispatch before emitting the first SSE event", async () => {
  const queued = { task: task("queued"), mode: "authenticated" as const };
  const completed = { task: task("completed"), mode: "authenticated" as const };
  mockGetAccessibleTask
    .mockResolvedValueOnce(queued)
    .mockResolvedValueOnce(completed);
  mockRedisSet.mockResolvedValue("OK");

  let acceptWorkerDispatch: ((response: Response) => void) | undefined;
  global.fetch = jest.fn(
    () =>
      new Promise<Response>((resolve) => {
        acceptWorkerDispatch = resolve;
      })
  );

  let routeResolved = false;
  const responsePromise = GET(
    new NextRequest("http://localhost/api/tasks/task-001/stream"),
    { params: Promise.resolve({ taskId: "task-001" }) }
  ).then((response) => {
    routeResolved = true;
    return response;
  });

  await new Promise<void>((resolve) => setImmediate(resolve));

  expect(global.fetch).toHaveBeenCalledWith(
    "http://localhost:3000/api/worker/pipeline",
    expect.objectContaining({ method: "POST" })
  );
  expect(routeResolved).toBe(false);
  expect(mockGetAccessibleTask).toHaveBeenCalledTimes(1);

  acceptWorkerDispatch?.(new Response(null, { status: 200 }));
  const response = await responsePromise;
  const firstEvent = await response.body?.getReader().read();

  expect(new TextDecoder().decode(firstEvent?.value)).toContain(
    '"status":"completed"'
  );
  expect((global.fetch as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
    mockGetAccessibleTask.mock.invocationCallOrder[1]
  );
  expect(mockAfter).not.toHaveBeenCalled();
});

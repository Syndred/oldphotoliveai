const mockAfterCallbacks: Array<() => unknown | Promise<unknown>> = [];
const mockRedisSet = jest.fn();
const originalFetch = global.fetch;

jest.mock("next/server", () => ({
  after: (callback: () => unknown | Promise<unknown>) => {
    mockAfterCallbacks.push(callback);
  },
}));

jest.mock("@/lib/config", () => ({
  config: { worker: { secret: "worker-secret" } },
}));

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => ({ set: mockRedisSet }),
}));

import { schedulePipelineWakeupForStatus } from "@/lib/worker-wakeup";

beforeEach(() => {
  jest.clearAllMocks();
  mockAfterCallbacks.length = 0;
  mockRedisSet.mockResolvedValueOnce("OK").mockResolvedValue(null);
  global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
});

afterAll(() => {
  global.fetch = originalFetch;
});

it("throttles repeated non-terminal status wakeups to one worker dispatch", async () => {
  schedulePipelineWakeupForStatus("queued");
  schedulePipelineWakeupForStatus("queued");

  expect(mockAfterCallbacks).toHaveLength(2);
  await Promise.all(mockAfterCallbacks.map((callback) => callback()));

  expect(mockRedisSet).toHaveBeenCalledTimes(2);
  expect(mockRedisSet).toHaveBeenCalledWith(
    "worker:pipeline:wakeup",
    "1",
    { nx: true, ex: 60 }
  );
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

it("does not schedule wakeups for terminal task statuses", () => {
  schedulePipelineWakeupForStatus("completed");
  schedulePipelineWakeupForStatus("failed");
  schedulePipelineWakeupForStatus("cancelled");

  expect(mockAfterCallbacks).toHaveLength(0);
});

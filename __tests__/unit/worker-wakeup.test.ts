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

import {
  requestPipelineWakeupForStatus,
  schedulePipelineWakeupForStatus,
} from "@/lib/worker-wakeup";

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

it("isolates an awaited worker dispatch failure", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  mockRedisSet.mockReset().mockResolvedValue("OK");
  global.fetch = jest.fn().mockRejectedValue(new Error("worker unavailable"));

  try {
    await expect(
      requestPipelineWakeupForStatus("queued")
    ).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});

it("bounds an awaited wakeup when Redis does not respond", async () => {
  jest.useFakeTimers();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  mockRedisSet.mockReset().mockImplementation(() => new Promise(() => {}));

  try {
    const wakeup = requestPipelineWakeupForStatus("queued");
    await jest.advanceTimersByTimeAsync(5_000);
    await expect(wakeup).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
    jest.useRealTimers();
  }
});

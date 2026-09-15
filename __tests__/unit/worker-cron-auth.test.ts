const mockAfter = jest.fn();
const mockResetAllDailyQuotas = jest.fn();
const mockRedisScan = jest.fn();
const mockGetRedisClient = jest.fn(() => ({ scan: mockRedisScan }));

jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (callback: () => unknown | Promise<unknown>) => mockAfter(callback),
}));

jest.mock("@/lib/config", () => ({
  config: { worker: { secret: "worker-secret" } },
}));

jest.mock("@/lib/quota", () => ({
  resetAllDailyQuotas: (...args: unknown[]) =>
    mockResetAllDailyQuotas(...args),
}));

jest.mock("@/lib/redis", () => ({
  getRedisClient: () => mockGetRedisClient(),
  hardDeleteTask: jest.fn(),
  getTask: jest.fn(),
}));

jest.mock("@/lib/r2", () => ({
  deleteTaskFiles: jest.fn(),
}));

jest.mock("@/lib/queue", () => ({
  removeFromQueue: jest.fn(),
  claimNextTask: jest.fn(),
  getQueueLength: jest.fn(),
  refreshTaskClaim: jest.fn(),
  settleTaskClaim: jest.fn(),
}));

jest.mock("@/lib/lock", () => ({
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
  refreshLock: jest.fn(),
}));

jest.mock("@/lib/pipeline", () => ({
  executePipeline: jest.fn(),
}));

import {
  GET as cleanupGet,
  POST as cleanupPost,
} from "@/app/api/worker/cleanup/route";
import {
  GET as pipelineGet,
  POST as pipelinePost,
} from "@/app/api/worker/pipeline/route";
import {
  GET as quotaResetGet,
  POST as quotaResetPost,
} from "@/app/api/worker/quota-reset/route";

const originalCronSecret = process.env.CRON_SECRET;

const workerRoutes = [
  { name: "cleanup", get: cleanupGet, post: cleanupPost },
  { name: "pipeline", get: pipelineGet, post: pipelinePost },
  { name: "quota reset", get: quotaResetGet, post: quotaResetPost },
] as const;

function request(authorization?: string): Request {
  return new Request("http://localhost/api/worker/test", {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.CRON_SECRET;
  mockRedisScan.mockResolvedValue(["0", []]);
  mockResetAllDailyQuotas.mockResolvedValue(undefined);
});

afterAll(() => {
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }
});

describe("worker cron authentication", () => {
  it.each(workerRoutes)(
    "$name GET fails closed when CRON_SECRET is missing",
    async ({ get }) => {
      const response = await get(request());

      expect(response.status).toBe(401);
    }
  );

  it.each(workerRoutes)(
    "$name GET rejects the wrong cron secret",
    async ({ get }) => {
      process.env.CRON_SECRET = "cron-secret";

      const response = await get(request("Bearer wrong-secret"));

      expect(response.status).toBe(401);
    }
  );

  it.each(workerRoutes)(
    "$name GET accepts the configured cron secret",
    async ({ get }) => {
      process.env.CRON_SECRET = "cron-secret";

      const response = await get(request("Bearer cron-secret"));

      expect(response.status).toBe(200);
    }
  );

  it.each(workerRoutes)(
    "$name POST still requires WORKER_SECRET",
    async ({ post }) => {
      const rejected = await post(request("Bearer wrong-secret"));
      const accepted = await post(request("Bearer worker-secret"));

      expect(rejected.status).toBe(401);
      expect(accepted.status).toBe(200);
    }
  );
});

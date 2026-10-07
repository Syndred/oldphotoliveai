import type { Task, User } from "@/types";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";
const mockEval = jest.fn();
const mockGet = jest.fn();
const mockSend = jest.fn();
const mockDelete = jest.fn();
let mockId = 0;
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval, get: mockGet }) }));
jest.mock("@/lib/r2", () => ({ getS3Client: () => ({ send: mockSend }), deleteFromR2: (...args: unknown[]) => mockDelete(...args) }));
jest.mock("uuid", () => ({ v4: () => `new-${++mockId}` }));
jest.mock("@/lib/config", () => ({ config: { r2: { bucketName: "bucket" } } }));
import { createTaskUpgrade } from "@/lib/task-upgrade";
import { getExistingTaskUpgrade } from "@/lib/task-creation";
const source = { id: "source-1", originalImageKey: "tasks/source-1/original.png", workflow: "restore" } as Task;
const user = { id: "user-1", tier: "pay_as_you_go" } as User;
beforeEach(() => { jest.clearAllMocks(); mockSend.mockResolvedValue({}); mockDelete.mockResolvedValue(undefined); });

it("serializes concurrent upgrades into one credit debit and one queue entry with independent source", async () => {
  const redis = new RedisLuaFixture();
  redis.setString("quota:user-1", JSON.stringify({ credits: 2 }));
  mockEval.mockImplementation((...args: Parameters<RedisLuaFixture["eval"]>) => redis.eval(...args));
  const results = await Promise.all([createTaskUpgrade(user, source), createTaskUpgrade(user, source)]);
  expect(results.map(r => r.outcome).sort()).toEqual(["created", "existing"]);
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(1);
  expect(redis.sortedMembers("queue:tasks")).toHaveLength(1);
  const created = results.find(r => r.outcome === "created")!;
  if (created.outcome !== "created") throw Error("missing created task");
  expect(created.task).toMatchObject({ generationTier: "pay_as_you_go", upgradeSourceTaskId: "source-1", workflow: "restore" });
  expect(created.task.originalImageKey).not.toBe(source.originalImageKey);
  expect(mockSend.mock.calls[0][0].input.CopySource).toBe("bucket/tasks/source-1/original.png");
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).not.toHaveBeenCalledWith(created.task.originalImageKey);
  expect(mockDelete).not.toHaveBeenCalledWith(source.originalImageKey);
});

it("cleans up a rejected copy without reducing an empty balance", async () => {
  const redis = new RedisLuaFixture();
  redis.setString("quota:user-1", JSON.stringify({ credits: 0 }));
  mockEval.mockImplementation((...args: Parameters<RedisLuaFixture["eval"]>) => redis.eval(...args));
  expect(await createTaskUpgrade(user, source)).toMatchObject({ outcome: "rejected", code: "NO_CREDITS" });
  expect(redis.sortedMembers("queue:tasks")).toHaveLength(0);
  expect(mockDelete).toHaveBeenCalledTimes(1);
});

it("retains the source copy when Redis commit outcome is ambiguous", async () => {
  mockEval.mockRejectedValue(new Error("connection timed out after commit"));
  await expect(createTaskUpgrade(user, source)).rejects.toThrow("timed out");
  expect(mockDelete).not.toHaveBeenCalled();
});

it("does not enqueue or debit when the source copy fails", async () => {
  mockSend.mockRejectedValueOnce(new Error("source deleted"));
  await expect(createTaskUpgrade(user, source)).rejects.toThrow("source deleted");
  expect(mockEval).not.toHaveBeenCalled();
});

it("does not replay a deleted upgrade forever", async () => {
  const redis = new RedisLuaFixture();
  redis.setString("quota:user-1", JSON.stringify({ credits: 2 }));
  mockEval.mockImplementation((...args: Parameters<RedisLuaFixture["eval"]>) => redis.eval(...args));
  await createTaskUpgrade(user, source);
  const markerKey = mockEval.mock.calls[0][1][4];
  redis.setString(markerKey, "deleted-task");
  const result = await createTaskUpgrade(user, source);
  expect(result.outcome).toBe("created");
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(0);
});

it("recovers the last-credit purchase using the exact production marker and validates its owner", async () => {
  const redis = new RedisLuaFixture();
  redis.setString("quota:user-1", JSON.stringify({ credits: 1 }));
  mockEval.mockImplementation((...args: Parameters<RedisLuaFixture["eval"]>) => redis.eval(...args));
  mockGet.mockImplementation(async (key: string) => {
    const value = redis.getString(key);
    if (!value) return null;
    try { return JSON.parse(value); } catch { return value; }
  });
  const created = await createTaskUpgrade(user, source);
  if (created.outcome !== "created") throw Error("expected purchase");
  expect(JSON.parse(redis.getString("quota:user-1")!).credits).toBe(0);
  expect(await getExistingTaskUpgrade(user.id, source)).toBe(created.task.id);
  expect(await getExistingTaskUpgrade("other-user", source)).toBeUndefined();
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockEval).toHaveBeenCalledTimes(1);
  redis.setString(`task:${created.task.id}`, JSON.stringify({ ...created.task, userId: "other-user" }));
  expect(await getExistingTaskUpgrade(user.id, source)).toBeUndefined();
  redis.setString(`task:${created.task.id}`, JSON.stringify({ ...created.task, upgradeSourceTaskId: "other-source" }));
  expect(await getExistingTaskUpgrade(user.id, source)).toBeUndefined();
  redis.setString(mockEval.mock.calls[0][1][4], "deleted-task");
  expect(await getExistingTaskUpgrade(user.id, source)).toBeUndefined();
});

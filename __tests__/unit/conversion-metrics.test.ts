import { recordCompletedGeneration } from "@/lib/conversion-metrics";
import type { Task } from "@/types";
const mockEval = jest.fn();
jest.mock("@/lib/redis", () => ({ getRedisClient: () => ({ eval: mockEval }) }));
beforeEach(() => mockEval.mockReset());
it("records aggregate paid delivery without photo keys or user identifiers", async () => {
  await recordCompletedGeneration({ id: "task", generationTier: "pay_as_you_go", upgradeSourceTaskId: "source", originalImageKey: "private", userId: "private-owner" } as Task);
  expect(mockEval).toHaveBeenCalledWith(expect.any(String), ["conversion:completed:task", expect.stringMatching(/^conversion:\d{4}-\d{2}-\d{2}$/)], ["1", "1", "0"]);
  expect(JSON.stringify(mockEval.mock.calls)).not.toContain("private");
});
it("never propagates analytics failure into paid generation", async () => {
  mockEval.mockRejectedValue(new Error("offline"));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(recordCompletedGeneration({ id: "task", priority: "normal" } as Task)).resolves.toBeUndefined();
  log.mockRestore();
});

it("executes the Lua dedupe so replaying delivery cannot inflate counts", async () => {
  const { RedisLuaFixture } = await import("../helpers/redis-lua-fixture");
  const redis = new RedisLuaFixture();
  mockEval.mockImplementation((script, keys, args) => redis.eval(script, keys, args));
  const task = { id: "paid-task", generationTier: "pay_as_you_go", upgradeSourceTaskId: "source" } as Task;
  await Promise.all([recordCompletedGeneration(task), recordCompletedGeneration(task)]);
  expect(redis.getHash(`conversion:${new Date().toISOString().slice(0, 10)}`)).toEqual({ generations_completed: 1, paid_generations_completed: 1, hd_remakes_completed: 1 });
});

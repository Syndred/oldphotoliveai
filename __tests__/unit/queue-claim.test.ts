import {
  TASK_CLAIM_SCRIPT,
  TASK_CLAIM_SETTLE_SCRIPT,
} from "@/lib/queue";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";

const READY = "queue:tasks";
const PROCESSING = "queue:tasks:processing";
const TASK_KEY = "task:task-1";

type ClaimResult = [string, string, string];

function claimArgs(now: number, expiresAt: number, token: string): string[] {
  return [String(now), String(expiresAt), token];
}

function asClaim(result: unknown): ClaimResult {
  expect(Array.isArray(result)).toBe(true);
  expect((result as unknown[]).length).toBe(3);
  return result as ClaimResult;
}

describe("executable Redis Lua queue state machine", () => {
  let redis: RedisLuaFixture;

  beforeEach(() => {
    redis = new RedisLuaFixture();
    redis.setString(TASK_KEY, JSON.stringify({ id: "task-1", status: "queued" }));
    redis.addSorted(READY, 1234, "task-1");
  });

  it("allows only one of two concurrent claims to receive the task", async () => {
    const results = await Promise.all([
      redis.eval(TASK_CLAIM_SCRIPT, [READY, PROCESSING], claimArgs(1000, 2000, "a")),
      redis.eval(TASK_CLAIM_SCRIPT, [READY, PROCESSING], claimArgs(1000, 2000, "b")),
    ]);

    expect(results.filter((result) => (result as unknown[]).length === 3)).toHaveLength(1);
    expect(results.filter((result) => (result as unknown[]).length === 0)).toHaveLength(1);
    expect(redis.sortedMembers(READY)).toEqual([]);
    expect(redis.sortedMembers(PROCESSING)).toHaveLength(1);
  });

  it("returns an unfinished lock-conflict claim at its original score", async () => {
    const claim = asClaim(
      await redis.eval(
        TASK_CLAIM_SCRIPT,
        [READY, PROCESSING],
        claimArgs(1000, 2000, "lock-conflict")
      )
    );

    const result = await redis.eval(
      TASK_CLAIM_SETTLE_SCRIPT,
      [PROCESSING, READY, TASK_KEY],
      [claim[2], claim[1], claim[0]]
    );

    expect(result).toBe("REQUEUED");
    expect(redis.sortedScore(READY, "task-1")).toBe(1234);
    expect(redis.sortedMembers(PROCESSING)).toEqual([]);
  });

  it("recovers an expired lease and prevents a stale token from replacing the new claim", async () => {
    const oldClaim = asClaim(
      await redis.eval(
        TASK_CLAIM_SCRIPT,
        [READY, PROCESSING],
        claimArgs(1000, 2000, "old-token")
      )
    );
    const newClaim = asClaim(
      await redis.eval(
        TASK_CLAIM_SCRIPT,
        [READY, PROCESSING],
        claimArgs(2001, 3001, "new-token")
      )
    );

    const staleResult = await redis.eval(
      TASK_CLAIM_SETTLE_SCRIPT,
      [PROCESSING, READY, TASK_KEY],
      [oldClaim[2], oldClaim[1], oldClaim[0]]
    );

    expect(staleResult).toBe("STALE");
    expect(newClaim[0]).toBe("task-1");
    expect(newClaim[2]).toContain("new-token");
    expect(redis.sortedMembers(READY)).toEqual([]);
    expect(redis.sortedMembers(PROCESSING)).toEqual([newClaim[2]]);
  });

  it("acknowledges a terminal task without putting it back in the ready queue", async () => {
    const claim = asClaim(
      await redis.eval(
        TASK_CLAIM_SCRIPT,
        [READY, PROCESSING],
        claimArgs(1000, 2000, "terminal-token")
      )
    );
    redis.setString(TASK_KEY, JSON.stringify({ id: "task-1", status: "completed" }));

    const result = await redis.eval(
      TASK_CLAIM_SETTLE_SCRIPT,
      [PROCESSING, READY, TASK_KEY],
      [claim[2], claim[1], claim[0]]
    );

    expect(result).toBe("ACKED_TERMINAL");
    expect(redis.sortedMembers(READY)).toEqual([]);
    expect(redis.sortedMembers(PROCESSING)).toEqual([]);
  });
});

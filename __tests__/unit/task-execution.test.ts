import {
  TASK_EXECUTION_BEGIN_SCRIPT,
  TASK_EXECUTION_REPLACE_SCRIPT,
} from "@/lib/task-execution";
import { RedisLuaFixture } from "../helpers/redis-lua-fixture";

const TASK_KEY = "task:task-1";
const PROCESSING_KEY = "queue:tasks:processing";
const LOCK_KEY = "lock:task:task-1";

function beginArgs(
  executionToken: string,
  lockToken: string,
  nowMs: number
): string[] {
  return [
    executionToken,
    lockToken,
    String(nowMs),
    new Date(nowMs).toISOString(),
  ];
}

function taskJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: "task-1",
    status: "queued",
    progress: 5,
    ...overrides,
  });
}

describe("task execution fencing Lua", () => {
  let redis: RedisLuaFixture;

  beforeEach(() => {
    redis = new RedisLuaFixture();
    redis.setString(TASK_KEY, taskJson());
    redis.setString(LOCK_KEY, "old-lock");
    redis.addSorted(PROCESSING_KEY, 2000, "old-token");
  });

  it("lets a recovered claim fence a late write from the old worker", async () => {
    await expect(
      redis.eval(
        TASK_EXECUTION_BEGIN_SCRIPT,
        [TASK_KEY, PROCESSING_KEY, LOCK_KEY],
        beginArgs("old-token", "old-lock", 1000)
      )
    ).resolves.toBe("STARTED");
    redis.setString(LOCK_KEY, "new-lock");
    redis.addSorted(PROCESSING_KEY, 3000, "new-token");
    await expect(
      redis.eval(
        TASK_EXECUTION_BEGIN_SCRIPT,
        [TASK_KEY, PROCESSING_KEY, LOCK_KEY],
        beginArgs("new-token", "new-lock", 2001)
      )
    ).resolves.toBe("STARTED");

    const oldReplacement = taskJson({
      status: "completed",
      progress: 100,
      executionToken: "old-token",
    });
    const newReplacement = taskJson({
      status: "restoring",
      progress: 25,
      executionToken: "new-token",
    });

    await expect(
      redis.eval(TASK_EXECUTION_REPLACE_SCRIPT, [TASK_KEY], ["old-token", oldReplacement])
    ).resolves.toBe("STALE");
    await expect(
      redis.eval(TASK_EXECUTION_REPLACE_SCRIPT, [TASK_KEY], ["new-token", newReplacement])
    ).resolves.toBe("UPDATED");

    expect(JSON.parse(redis.getString(TASK_KEY) ?? "{}")).toMatchObject({
      status: "restoring",
      progress: 25,
      executionToken: "new-token",
    });
  });

  it("does not install a new token on a terminal task", async () => {
    redis.setString(TASK_KEY, taskJson({ status: "completed", progress: 100 }));

    await expect(
      redis.eval(
        TASK_EXECUTION_BEGIN_SCRIPT,
        [TASK_KEY, PROCESSING_KEY, LOCK_KEY],
        beginArgs("old-token", "old-lock", 1000)
      )
    ).resolves.toBe("TERMINAL");
  });

  it("rejects a stale worker that resumes after the recovered owner begins", async () => {
    redis.setString(LOCK_KEY, "new-lock");
    redis.addSorted(PROCESSING_KEY, 3000, "new-token");

    await expect(
      redis.eval(
        TASK_EXECUTION_BEGIN_SCRIPT,
        [TASK_KEY, PROCESSING_KEY, LOCK_KEY],
        beginArgs("new-token", "new-lock", 2001)
      )
    ).resolves.toBe("STARTED");
    await expect(
      redis.eval(
        TASK_EXECUTION_BEGIN_SCRIPT,
        [TASK_KEY, PROCESSING_KEY, LOCK_KEY],
        beginArgs("old-token", "old-lock", 2001)
      )
    ).resolves.toBe("STALE_CLAIM");
    expect(JSON.parse(redis.getString(TASK_KEY) ?? "{}").executionToken).toBe(
      "new-token"
    );
  });

  it("does not let the completing token regress a terminal task", async () => {
    redis.setString(
      TASK_KEY,
      taskJson({
        status: "completed",
        progress: 100,
        executionToken: "same-token",
      })
    );

    await expect(
      redis.eval(
        TASK_EXECUTION_REPLACE_SCRIPT,
        [TASK_KEY],
        [
          "same-token",
          taskJson({
            status: "restoring",
            progress: 25,
            executionToken: "same-token",
          }),
        ]
      )
    ).resolves.toBe("TERMINAL");
    expect(JSON.parse(redis.getString(TASK_KEY) ?? "{}").status).toBe("completed");
  });
});

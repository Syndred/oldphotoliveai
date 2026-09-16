// Priority Queue Operations
// Requirements: 14.1, 14.2, 14.3, 14.4
// Redis Key: queue:tasks → Sorted Set
// Score = priorityWeight + timestamp_ms
// urgent priority: score = -1_000_000_000_000_000 + ts
// high priority: score = 0 + ts
// normal priority: score = 1_000_000_000_000_000 + ts

import { getRedisClient } from "./redis";
import { PRIORITY_WEIGHTS } from "@/types";
import type { TaskPriority } from "@/types";
import { randomUUID } from "crypto";

const QUEUE_KEY = "queue:tasks";
const PROCESSING_QUEUE_KEY = "queue:tasks:processing";
const DEFAULT_CLAIM_LEASE_MS = 5 * 60 * 1000;
const EXPIRED_CLAIM_RECOVERY_LIMIT = 100;

export interface TaskClaim {
  taskId: string;
  score: number;
  leaseMember: string;
}

export type TaskClaimSettlement = "acknowledged" | "requeued" | "stale";

export const TASK_CLAIM_SCRIPT = `
local expiredClaims = redis.call(
  'ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[1],
  'LIMIT', 0, ${EXPIRED_CLAIM_RECOVERY_LIMIT}
)
for _, expiredMember in ipairs(expiredClaims) do
  -- Prefix new lease members so Upstash does not automatically deserialize
  -- the JSON string into a JavaScript object on the way back to the worker.
  -- Keep accepting the old unprefixed format while existing leases expire.
  local encodedClaim = expiredMember
  if string.sub(expiredMember, 1, 6) == 'claim:' then
    encodedClaim = string.sub(expiredMember, 7)
  end
  local ok, expiredClaim = pcall(cjson.decode, encodedClaim)
  if ok and type(expiredClaim) == 'table' and expiredClaim.taskId and expiredClaim.score then
    local rawTask = redis.call('GET', 'task:' .. expiredClaim.taskId)
    if rawTask then
      local taskOk, task = pcall(cjson.decode, rawTask)
      if taskOk and type(task) == 'table'
        and task.status ~= 'completed'
        and task.status ~= 'failed'
        and task.status ~= 'cancelled' then
        redis.call('ZADD', KEYS[1], 'NX', tonumber(expiredClaim.score), expiredClaim.taskId)
      end
    end
  end
  redis.call('ZREM', KEYS[2], expiredMember)
end

local nextItems = redis.call('ZPOPMIN', KEYS[1], 1)
if #nextItems == 0 then
  return {}
end

local taskId = tostring(nextItems[1])
local score = tonumber(nextItems[2])
local queueClaim = 'claim:' .. cjson.encode({ taskId = taskId, score = score, token = ARGV[3] })
redis.call('ZADD', KEYS[2], tonumber(ARGV[2]), queueClaim)
return { taskId, tostring(score), queueClaim }
`;

export const TASK_CLAIM_SETTLE_SCRIPT = `
if redis.call('ZREM', KEYS[1], ARGV[1]) == 0 then
  return 'STALE'
end

local rawTask = redis.call('GET', KEYS[3])
if not rawTask then
  return 'ACKED_MISSING'
end

local ok, task = pcall(cjson.decode, rawTask)
if not ok or type(task) ~= 'table' then
  return 'ACKED_INVALID'
end

if task.status == 'completed' or task.status == 'failed' or task.status == 'cancelled' then
  return 'ACKED_TERMINAL'
end

redis.call('ZADD', KEYS[2], 'NX', tonumber(ARGV[2]), ARGV[3])
return 'REQUEUED'
`;

const TASK_CLAIM_REFRESH_SCRIPT = `
if redis.call('ZSCORE', KEYS[1], ARGV[1]) == false then
  return 0
end
redis.call('ZADD', KEYS[1], 'XX', tonumber(ARGV[2]), ARGV[1])
return 1
`;

/**
 * Add a task to the priority queue.
 * Score = PRIORITY_WEIGHTS[priority] + Date.now()
 * This ensures urgent tasks are dequeued before high-priority tasks,
 * high-priority tasks are dequeued before normal ones, and within the same
 * priority earlier tasks come first (FIFO).
 */
export async function enqueueTask(
  taskId: string,
  priority: TaskPriority
): Promise<void> {
  const redis = getRedisClient();
  const score = PRIORITY_WEIGHTS[priority] + Date.now();
  await redis.zadd(QUEUE_KEY, { score, member: taskId });
}

/**
 * Atomically recover expired work and lease the highest-priority task.
 * A claimed task remains recoverable until settleTaskClaim acknowledges a
 * terminal state or returns the unfinished task to the ready queue.
 */
export async function claimNextTask(
  nowMs = Date.now(),
  leaseMs = DEFAULT_CLAIM_LEASE_MS,
  claimToken: string = randomUUID()
): Promise<TaskClaim | null> {
  const redis = getRedisClient();
  const result = (await redis.eval(
    TASK_CLAIM_SCRIPT,
    [QUEUE_KEY, PROCESSING_QUEUE_KEY],
    [String(nowMs), String(nowMs + leaseMs), claimToken]
  )) as unknown;

  if (!Array.isArray(result) || result.length < 3) return null;
  const score = Number(result[1]);
  if (!Number.isFinite(score)) {
    throw new Error("Task claim returned an invalid queue score");
  }

  return {
    taskId: String(result[0]),
    score,
    leaseMember: String(result[2]),
  };
}

/** Extend a live queue claim while its task lock is also being renewed. */
export async function refreshTaskClaim(
  claim: TaskClaim,
  nowMs = Date.now(),
  leaseMs = DEFAULT_CLAIM_LEASE_MS
): Promise<boolean> {
  const result = await getRedisClient().eval(
    TASK_CLAIM_REFRESH_SCRIPT,
    [PROCESSING_QUEUE_KEY],
    [claim.leaseMember, String(nowMs + leaseMs)]
  );
  return Number(result) === 1;
}

/**
 * Atomically acknowledge terminal work, or requeue an unfinished claim at its
 * original priority score. A stale lease cannot affect a newer claim.
 */
export async function settleTaskClaim(
  claim: TaskClaim
): Promise<TaskClaimSettlement> {
  const result = String(
    await getRedisClient().eval(
      TASK_CLAIM_SETTLE_SCRIPT,
      [PROCESSING_QUEUE_KEY, QUEUE_KEY, `task:${claim.taskId}`],
      [claim.leaseMember, String(claim.score), claim.taskId]
    )
  );

  if (result === "REQUEUED") return "requeued";
  if (result === "STALE") return "stale";
  if (
    result === "ACKED_TERMINAL" ||
    result === "ACKED_MISSING" ||
    result === "ACKED_INVALID"
  ) {
    return "acknowledged";
  }
  throw new Error(`Unknown task claim settlement: ${result}`);
}

/**
 * Get the number of tasks in the queue, split by priority.
 */
export async function getQueueLength(): Promise<{
  urgent: number;
  high: number;
  normal: number;
}> {
  const redis = getRedisClient();

  // Count urgent-priority tasks: score < PRIORITY_WEIGHTS.high
  const urgent = await redis.zcount(
    QUEUE_KEY,
    "-inf",
    PRIORITY_WEIGHTS.high - 1
  );

  // Count high-priority tasks: score in [PRIORITY_WEIGHTS.high, PRIORITY_WEIGHTS.normal - 1]
  const high = await redis.zcount(
    QUEUE_KEY,
    PRIORITY_WEIGHTS.high,
    PRIORITY_WEIGHTS.normal - 1
  );

  // Count normal-priority tasks: score >= PRIORITY_WEIGHTS.normal
  const normal = await redis.zcount(
    QUEUE_KEY,
    PRIORITY_WEIGHTS.normal,
    "+inf"
  );

  return { urgent, high, normal };
}

/**
 * Remove a specific task from the queue (e.g., on cancellation).
 */
export async function removeFromQueue(taskId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.zrem(QUEUE_KEY, taskId);
}

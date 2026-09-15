import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getRedisClient } from "@/lib/redis";
import { buildAnonymousUserId } from "@/lib/anonymous";
import { PRIORITY_WEIGHTS, STATUS_PROGRESS_MAP } from "@/types";
import type { Task, TaskPriority, TaskWorkflow, User } from "@/types";

export type TaskCreationRejectionCode =
  | "DAILY_QUOTA_EXHAUSTED"
  | "NO_CREDITS"
  | "QUOTA_NOT_INITIALIZED"
  | "ANONYMOUS_TRIAL_USED";

type CreatedResult = { outcome: "created"; task: Task; remaining?: number };
type ExistingResult = { outcome: "existing"; taskId: string; remaining?: number };
type RejectedResult = {
  outcome: "rejected";
  code: TaskCreationRejectionCode;
  remaining: number;
};

export type TaskCreationResult = CreatedResult | ExistingResult | RejectedResult;

const AUTHENTICATED_CREATE_SCRIPT = `
local allowedString = function(key)
  local t = redis.call('TYPE', key).ok
  return t == 'none' or t == 'string'
end
local allowedZset = function(key)
  local t = redis.call('TYPE', key).ok
  return t == 'none' or t == 'zset'
end
if not allowedString(KEYS[1]) or not allowedString(KEYS[2]) or
   not allowedString(KEYS[5]) or not allowedZset(KEYS[3]) or
   not allowedZset(KEYS[4]) then
  return {'ERROR', 'INTERNAL_KEY_TYPE'}
end

local existing = redis.call('GET', KEYS[5])
if existing then
  return {'EXISTING', existing, '-1'}
end

local tier = ARGV[5]
local remaining = -1
local quotaJson = redis.call('GET', KEYS[1])
local quota = nil
if tier ~= 'professional' then
  if not quotaJson then
    if tier == 'pay_as_you_go' then
      return {'REJECTED', 'NO_CREDITS', '0'}
    end
    return {'REJECTED', 'QUOTA_NOT_INITIALIZED', '0'}
  end
  local ok, decoded = pcall(cjson.decode, quotaJson)
  if not ok or type(decoded) ~= 'table' then
    return {'ERROR', 'INVALID_QUOTA'}
  end
  quota = decoded
end

if tier == 'pay_as_you_go' then
  if quota.creditsExpireAt and quota.creditsExpireAt ~= cjson.null and
     quota.creditsExpireAt < ARGV[6] then
    quota.credits = 0
    quota.creditsExpireAt = cjson.null
    redis.call('SET', KEYS[1], cjson.encode(quota))
  end
  local credits = tonumber(quota.credits) or 0
  if credits <= 0 then
    return {'REJECTED', 'NO_CREDITS', '0'}
  end
  quota.credits = credits - 1
  remaining = quota.credits
  redis.call('SET', KEYS[1], cjson.encode(quota))
elseif tier == 'free' then
  local available = tonumber(quota.remaining) or 0
  if available <= 0 then
    return {'REJECTED', 'DAILY_QUOTA_EXHAUSTED', '0'}
  end
  quota.remaining = available - 1
  remaining = quota.remaining
  redis.call('SET', KEYS[1], cjson.encode(quota))
end

redis.call('SET', KEYS[2], ARGV[2])
redis.call('ZADD', KEYS[3], ARGV[3], ARGV[1])
redis.call('ZADD', KEYS[4], ARGV[4], ARGV[1])
redis.call('SET', KEYS[5], ARGV[1], 'EX', 86400)
return {'CREATED', ARGV[1], tostring(remaining)}
`;

const ANONYMOUS_CREATE_SCRIPT = `
local allowedString = function(key)
  local t = redis.call('TYPE', key).ok
  return t == 'none' or t == 'string'
end
local allowedZset = function(key)
  local t = redis.call('TYPE', key).ok
  return t == 'none' or t == 'zset'
end
if not allowedString(KEYS[1]) or not allowedString(KEYS[2]) or
   not allowedString(KEYS[3]) or not allowedZset(KEYS[4]) or
   not allowedZset(KEYS[5]) then
  return {'ERROR', 'INTERNAL_KEY_TYPE'}
end

local existing = redis.call('GET', KEYS[1])
if existing then
  local separator = string.find(existing, '|', 1, true)
  if separator then
    local existingTaskId = string.sub(existing, 1, separator - 1)
    local existingDigest = string.sub(existing, separator + 1)
    if existingDigest == ARGV[7] then
      return {'EXISTING', existingTaskId}
    end
  end
  return {'REJECTED', 'ANONYMOUS_TRIAL_USED'}
end

if redis.call('EXISTS', KEYS[2]) == 0 then
  redis.call('SET', KEYS[2], ARGV[3])
end
redis.call('SET', KEYS[3], ARGV[2])
redis.call('ZADD', KEYS[4], ARGV[4], ARGV[1])
redis.call('ZADD', KEYS[5], ARGV[5], ARGV[1])
redis.call('SET', KEYS[1], ARGV[6])
return {'CREATED', ARGV[1]}
`;

function buildTask(
  userId: string,
  imageKey: string,
  priority: TaskPriority,
  workflow: TaskWorkflow,
  now: Date
): Task {
  return {
    id: uuidv4(),
    userId,
    status: "pending",
    priority,
    workflow,
    originalImageKey: imageKey,
    restoredImageKey: null,
    colorizedImageKey: null,
    animationVideoKey: null,
    errorMessage: null,
    internalErrorMessage: null,
    failureStage: null,
    failureCode: null,
    attemptCount: 1,
    progress: STATUS_PROGRESS_MAP.pending,
    createdAt: now.toISOString(),
    completedAt: null,
  };
}

function dedupeDigest(userId: string, imageKey: string, workflow: TaskWorkflow): string {
  return createHash("sha256")
    .update(`${userId}\0${imageKey}\0${workflow}`)
    .digest("hex");
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export async function createAuthenticatedTaskAtomic(input: {
  user: User;
  imageKey: string;
  workflow: TaskWorkflow;
  priority?: TaskPriority;
  now?: Date;
}): Promise<TaskCreationResult> {
  const now = input.now ?? new Date();
  const priority = input.priority ?? (input.user.tier === "professional"
    ? "urgent"
    : input.user.tier === "pay_as_you_go"
      ? "high"
      : "normal");
  const task = buildTask(input.user.id, input.imageKey, priority, input.workflow, now);
  const digest = dedupeDigest(input.user.id, input.imageKey, input.workflow);
  const redis = getRedisClient();
  const result = await redis.eval(AUTHENTICATED_CREATE_SCRIPT, [
    `quota:${input.user.id}`,
    `task:${task.id}`,
    `user:${input.user.id}:tasks`,
    "queue:tasks",
    `task:create:${digest}`,
  ], [
    task.id,
    JSON.stringify(task),
    String(now.getTime()),
    String(PRIORITY_WEIGHTS[priority] + now.getTime()),
    input.user.tier,
    now.toISOString(),
  ]) as unknown;

  const values = Array.isArray(result) ? result.map(String) : [];
  if (values[0] === "CREATED") {
    return { outcome: "created", task, remaining: parseNumber(values[2]) };
  }
  if (values[0] === "EXISTING") {
    return { outcome: "existing", taskId: values[1], remaining: parseNumber(values[2]) };
  }
  if (values[0] === "REJECTED") {
    return {
      outcome: "rejected",
      code: values[1] as TaskCreationRejectionCode,
      remaining: parseNumber(values[2]) ?? 0,
    };
  }
  throw new Error(`Atomic task creation failed: ${values[1] || "UNKNOWN"}`);
}

export async function createAnonymousTaskAtomic(input: {
  visitorId: string;
  imageKey: string;
  now?: Date;
}): Promise<TaskCreationResult> {
  const now = input.now ?? new Date();
  const userId = buildAnonymousUserId(input.visitorId);
  const task = buildTask(userId, input.imageKey, "normal", "animate", now);
  const anonymousUser: User = {
    id: userId,
    googleId: userId,
    email: `${input.visitorId}@anonymous.oldphotoliveai.local`,
    name: "Anonymous visitor",
    avatarUrl: null,
    tier: "free",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const redis = getRedisClient();
  const imageDigest = createHash("sha256").update(input.imageKey).digest("hex");
  const trialRecord = `${task.id}|${imageDigest}`;
  const result = await redis.eval(ANONYMOUS_CREATE_SCRIPT, [
    `anonymous:${input.visitorId}:trial`,
    `user:${userId}`,
    `task:${task.id}`,
    `user:${userId}:tasks`,
    "queue:tasks",
  ], [
    task.id,
    JSON.stringify(task),
    JSON.stringify(anonymousUser),
    String(now.getTime()),
    String(PRIORITY_WEIGHTS.normal + now.getTime()),
    trialRecord,
    imageDigest,
  ]) as unknown;

  const values = Array.isArray(result) ? result.map(String) : [];
  if (values[0] === "CREATED") return { outcome: "created", task };
  if (values[0] === "EXISTING") {
    return { outcome: "existing", taskId: values[1] };
  }
  if (values[0] === "REJECTED") {
    return { outcome: "rejected", code: "ANONYMOUS_TRIAL_USED", remaining: 0 };
  }
  throw new Error(`Atomic anonymous task creation failed: ${values[1] || "UNKNOWN"}`);
}

export { AUTHENTICATED_CREATE_SCRIPT, ANONYMOUS_CREATE_SCRIPT };

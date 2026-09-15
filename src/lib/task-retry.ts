import { getRedisClient } from "@/lib/redis";
import { PRIORITY_WEIGHTS } from "@/types";
import type { Task } from "@/types";

export const TASK_RETRY_SCRIPT = `
local taskType = redis.call('TYPE', KEYS[1]).ok
local queueType = redis.call('TYPE', KEYS[2]).ok
if (taskType ~= 'string') or (queueType ~= 'none' and queueType ~= 'zset') then
  return {'ERROR', 'INTERNAL_KEY_TYPE'}
end
local raw = redis.call('GET', KEYS[1])
local ok, task = pcall(cjson.decode, raw)
if not ok or type(task) ~= 'table' then
  return {'ERROR', 'INVALID_TASK'}
end
local attempts = tonumber(task.attemptCount) or 1
if task.status == 'queued' then
  return {'ALREADY_QUEUED', tostring(attempts)}
end
if task.violation == true then
  return {'REJECTED', 'CONTENT_VIOLATION'}
end
if type(task.providerInvocations) == 'table' then
  for _, invocation in pairs(task.providerInvocations) do
    if type(invocation) == 'table' and
       ((invocation.status == 'provider_creation_started' and
         task.providerCreationDefinitivelyRejected ~= true) or
        (invocation.status == 'creation_unknown' and not invocation.predictionId) or
        (invocation.status == 'active' and not invocation.predictionId)) then
      return {'REJECTED', 'MANUAL_REVIEW_REQUIRED'}
    end
  end
end
if task.failureCode == 'provider_creation_unknown' then
  return {'REJECTED', 'MANUAL_REVIEW_REQUIRED'}
end
if task.status ~= 'failed' then
  return {'REJECTED', 'NOT_FAILED'}
end
attempts = attempts + 1
task.status = 'queued'
task.progress = 5
task.errorMessage = cjson.null
task.internalErrorMessage = cjson.null
task.failureStage = cjson.null
task.failureCode = cjson.null
task.completedAt = cjson.null
task.attemptCount = attempts
task.executionToken = cjson.null
task.executionStartedAt = cjson.null
task.providerCreationDefinitivelyRejected = false
if type(task.providerInvocations) == 'table' then
  for stage, invocation in pairs(task.providerInvocations) do
    if type(invocation) ~= 'table' or
       (invocation.status ~= 'active' and
        invocation.status ~= 'succeeded' and
        not (invocation.status == 'creation_unknown' and invocation.predictionId)) then
      task.providerInvocations[stage] = nil
    end
  end
end
redis.call('SET', KEYS[1], cjson.encode(task))
redis.call('ZADD', KEYS[2], ARGV[1], ARGV[2])
return {'RETRIED', tostring(attempts)}
`;

export async function retryTaskAtomic(
  task: Task,
  now = new Date()
): Promise<
  | { outcome: "retried" | "already_queued"; attemptCount: number }
  | {
      outcome: "rejected";
      code: "CONTENT_VIOLATION" | "MANUAL_REVIEW_REQUIRED" | "NOT_FAILED";
    }
> {
  const score = PRIORITY_WEIGHTS[task.priority] + now.getTime();
  const result = await getRedisClient().eval(
    TASK_RETRY_SCRIPT,
    [`task:${task.id}`, "queue:tasks"],
    [String(score), task.id]
  ) as unknown;
  const values = Array.isArray(result) ? result.map(String) : [];
  if (values[0] === "RETRIED" || values[0] === "ALREADY_QUEUED") {
    return {
      outcome: values[0] === "RETRIED" ? "retried" : "already_queued",
      attemptCount: Math.max(1, Number(values[1]) || 1),
    };
  }
  if (values[0] === "REJECTED") {
    return {
      outcome: "rejected",
      code: values[1] as
        | "CONTENT_VIOLATION"
        | "MANUAL_REVIEW_REQUIRED"
        | "NOT_FAILED",
    };
  }
  throw new Error(`Atomic task retry failed: ${values[1] || "UNKNOWN"}`);
}

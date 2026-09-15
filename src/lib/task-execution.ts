import { getRedisClient } from "@/lib/redis";
import { STATUS_PROGRESS_MAP } from "@/types";
import type {
  ProviderInvocation,
  Task,
  TaskProviderStage,
  TaskStatus,
} from "@/types";
import type { TaskClaim } from "@/lib/queue";
import type { LockLease } from "@/lib/lock";

const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

export const TASK_EXECUTION_BEGIN_SCRIPT = `
local claimExpiresAt = redis.call('ZSCORE', KEYS[2], ARGV[1])
if claimExpiresAt == false or tonumber(claimExpiresAt) <= tonumber(ARGV[3]) then
  return 'STALE_CLAIM'
end
if redis.call('GET', KEYS[3]) ~= ARGV[2] then
  return 'STALE_LOCK'
end
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'NOT_FOUND'
end
local ok, task = pcall(cjson.decode, raw)
if not ok or type(task) ~= 'table' then
  return 'INVALID_TASK'
end
if task.status == 'completed' or task.status == 'failed' or task.status == 'cancelled' then
  return 'TERMINAL'
end
task.executionToken = ARGV[1]
task.executionStartedAt = ARGV[4]
redis.call('SET', KEYS[1], cjson.encode(task))
return 'STARTED'
`;

export const TASK_EXECUTION_REPLACE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'NOT_FOUND'
end
local ok, task = pcall(cjson.decode, raw)
if not ok or type(task) ~= 'table' then
  return 'INVALID_TASK'
end
if task.executionToken ~= ARGV[1] then
  return 'STALE'
end
if task.status == 'completed' or task.status == 'failed' or task.status == 'cancelled' then
  return 'TERMINAL'
end
local replacementOk, replacement = pcall(cjson.decode, ARGV[2])
if not replacementOk or type(replacement) ~= 'table' then
  return 'INVALID_REPLACEMENT'
end
if replacement.executionToken ~= ARGV[1] then
  return 'INVALID_REPLACEMENT'
end
redis.call('SET', KEYS[1], ARGV[2])
return 'UPDATED'
`;

export class WorkerOwnershipLostError extends Error {
  constructor(taskId: string) {
    super(`Worker execution ownership lost for task ${taskId}`);
    this.name = "WorkerOwnershipLostError";
  }
}

function taskKey(taskId: string): string {
  return `task:${taskId}`;
}

function assertSignal(taskId: string, signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new WorkerOwnershipLostError(taskId);
  }
}

function asResult(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

export async function beginTaskExecution(
  taskId: string,
  claim: TaskClaim,
  lease: LockLease,
  now = new Date()
): Promise<"started" | "terminal"> {
  const result = asResult(await getRedisClient().eval(
    TASK_EXECUTION_BEGIN_SCRIPT,
    [taskKey(taskId), "queue:tasks:processing", lease.key],
    [claim.leaseMember, lease.token, String(now.getTime()), now.toISOString()]
  ));

  if (result === "STARTED") return "started";
  if (result === "TERMINAL") return "terminal";
  if (result === "STALE_CLAIM" || result === "STALE_LOCK") {
    throw new WorkerOwnershipLostError(taskId);
  }
  if (result === "NOT_FOUND") throw new Error(`Task not found: ${taskId}`);
  throw new Error(`Could not begin task execution: ${result || "UNKNOWN"}`);
}

export async function getTaskForExecution(
  taskId: string,
  executionToken: string,
  signal?: AbortSignal
): Promise<Task> {
  assertSignal(taskId, signal);
  const task = await getRedisClient().get<Task>(taskKey(taskId));
  assertSignal(taskId, signal);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  if (task.executionToken !== executionToken) {
    throw new WorkerOwnershipLostError(taskId);
  }
  return task;
}

async function replaceTaskFenced(
  task: Task,
  executionToken: string,
  signal?: AbortSignal
): Promise<void> {
  assertSignal(task.id, signal);
  const result = asResult(await getRedisClient().eval(
    TASK_EXECUTION_REPLACE_SCRIPT,
    [taskKey(task.id)],
    [executionToken, JSON.stringify(task)]
  ));
  assertSignal(task.id, signal);
  if (result === "UPDATED") return;
  if (result === "STALE" || result === "TERMINAL") {
    throw new WorkerOwnershipLostError(task.id);
  }
  if (result === "NOT_FOUND") throw new Error(`Task not found: ${task.id}`);
  throw new Error(`Could not update task execution: ${result || "UNKNOWN"}`);
}

export async function updateTaskStatusFenced(
  taskId: string,
  executionToken: string,
  status: TaskStatus,
  data?: Partial<Task>,
  signal?: AbortSignal
): Promise<void> {
  const task = await getTaskForExecution(taskId, executionToken, signal);
  task.status = status;

  const mappedProgress = STATUS_PROGRESS_MAP[status];
  if (mappedProgress >= 0) task.progress = mappedProgress;
  if (status === "completed") task.completedAt = new Date().toISOString();
  if (data) Object.assign(task, data);

  await replaceTaskFenced(task, executionToken, signal);
}

export async function updateTaskProviderInvocationFenced(
  taskId: string,
  executionToken: string,
  stage: TaskProviderStage,
  invocation: ProviderInvocation,
  signal?: AbortSignal
): Promise<void> {
  const task = await getTaskForExecution(taskId, executionToken, signal);
  task.providerInvocations = {
    ...task.providerInvocations,
    [stage]: invocation,
  };
  await replaceTaskFenced(task, executionToken, signal);
}

export async function assertTaskExecutionOwned(
  taskId: string,
  executionToken: string,
  signal?: AbortSignal
): Promise<void> {
  await getTaskForExecution(taskId, executionToken, signal);
}

export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

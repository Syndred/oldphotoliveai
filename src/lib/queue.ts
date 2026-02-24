// Priority Queue Operations
// Requirements: 14.1, 14.2, 14.3, 14.4
// Redis Key: queue:tasks → Sorted Set
// Score = priorityWeight + timestamp_ms
// high priority: score = 0 + ts (always dequeued first)
// normal priority: score = 1_000_000_000_000_000 + ts

import { getRedisClient } from "./redis";
import { PRIORITY_WEIGHTS } from "@/types";
import type { TaskPriority } from "@/types";

const QUEUE_KEY = "queue:tasks";

/**
 * Add a task to the priority queue.
 * Score = PRIORITY_WEIGHTS[priority] + Date.now()
 * This ensures all high-priority tasks have lower scores than normal ones,
 * and within the same priority, earlier tasks come first (FIFO).
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
 * Dequeue the highest-priority (lowest score) task from the queue.
 * Uses ZPOPMIN to atomically remove and return the task.
 * Returns null if the queue is empty.
 */
export async function dequeueTask(): Promise<string | null> {
  const redis = getRedisClient();
  const result = await redis.zpopmin(QUEUE_KEY, 1);

  if (!result || result.length === 0) return null;

  // Upstash zpopmin returns array of { member, score } objects
  const first = result[0];
  if (typeof first === "object" && first !== null && "member" in first) {
    return (first as { member: string; score: number }).member;
  }
  // Fallback: flat array format [member, score, ...]
  return String(first);
}

/**
 * Get the number of tasks in the queue, split by priority.
 * high = tasks with score < PRIORITY_WEIGHTS.normal
 * normal = tasks with score >= PRIORITY_WEIGHTS.normal
 */
export async function getQueueLength(): Promise<{
  high: number;
  normal: number;
}> {
  const redis = getRedisClient();

  // Count high-priority tasks: score in [0, PRIORITY_WEIGHTS.normal - 1]
  const high = await redis.zcount(
    QUEUE_KEY,
    0,
    PRIORITY_WEIGHTS.normal - 1
  );

  // Count normal-priority tasks: score >= PRIORITY_WEIGHTS.normal
  const normal = await redis.zcount(
    QUEUE_KEY,
    PRIORITY_WEIGHTS.normal,
    "+inf"
  );

  return { high, normal };
}

/**
 * Remove a specific task from the queue (e.g., on cancellation).
 */
export async function removeFromQueue(taskId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.zrem(QUEUE_KEY, taskId);
}

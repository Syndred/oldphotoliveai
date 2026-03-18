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

const QUEUE_KEY = "queue:tasks";

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

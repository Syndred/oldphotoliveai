// Distributed Lock using Redis SET NX EX
// Requirements: 14.3
// Key format: lock:task:{taskId}, TTL = 300s (5 minutes)
// Prevents the same task from being processed by multiple workers concurrently.

import { getRedisClient } from "./redis";

const DEFAULT_TTL_SECONDS = 300;

/**
 * Attempt to acquire a distributed lock.
 * Uses Redis SET with NX (only set if not exists) and EX (expiry in seconds).
 * Returns true if the lock was acquired, false if already held.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<boolean> {
  const redis = getRedisClient();
  const result = await redis.set(key, "locked", { nx: true, ex: ttlSeconds });
  return result === "OK";
}

/**
 * Release a distributed lock by deleting the key.
 */
export async function releaseLock(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

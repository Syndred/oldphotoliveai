// Distributed Lock using Redis SET NX EX
// Requirements: 14.3
// Key format: lock:task:{taskId}, TTL = 300s (5 minutes)
// Prevents the same task from being processed by multiple workers concurrently.

import { randomUUID } from "crypto";
import { getRedisClient } from "./redis";

const DEFAULT_TTL_SECONDS = 300;

export interface LockLease {
  key: string;
  token: string;
  ttlSeconds: number;
}

/**
 * Attempt to acquire a distributed lock.
 * Uses Redis SET with NX (only set if not exists) and EX (expiry in seconds).
 * Returns a lock lease on success, null if the lock is already held.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<LockLease | null> {
  const redis = getRedisClient();
  const token = randomUUID();
  const result = await redis.set(key, token, { nx: true, ex: ttlSeconds });
  if (result !== "OK") {
    return null;
  }
  return { key, token, ttlSeconds };
}

/**
 * Renew an existing lock lease.
 * Returns false if the lease is no longer owned by this worker.
 */
export async function refreshLock(
  lease: LockLease,
  ttlSeconds: number = lease.ttlSeconds
): Promise<boolean> {
  const redis = getRedisClient();
  const currentToken = await redis.get<string>(lease.key);
  if (currentToken !== lease.token) {
    return false;
  }

  const result = await redis.set(lease.key, lease.token, {
    xx: true,
    ex: ttlSeconds,
  });
  return result === "OK";
}

/**
 * Release a distributed lock only if this worker still owns it.
 */
export async function releaseLock(lease: LockLease): Promise<void> {
  const redis = getRedisClient();
  const currentToken = await redis.get<string>(lease.key);
  if (currentToken === lease.token) {
    await redis.del(lease.key);
  }
}

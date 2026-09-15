// Distributed Lock using Redis SET NX EX
// Requirements: 14.3
// Key format: lock:task:{taskId}, TTL = 300s (5 minutes)
// Prevents the same task from being processed by multiple workers concurrently.

import { randomUUID } from "crypto";
import { getRedisClient } from "./redis";

const DEFAULT_TTL_SECONDS = 300;

export const LOCK_REFRESH_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return 0
end
return redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
`;

export const LOCK_RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then
  return 0
end
return redis.call('DEL', KEYS[1])
`;

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
  const result = await getRedisClient().eval(
    LOCK_REFRESH_SCRIPT,
    [lease.key],
    [lease.token, String(ttlSeconds)]
  );
  return Number(result) === 1;
}

/**
 * Release a distributed lock only if this worker still owns it.
 */
export async function releaseLock(lease: LockLease): Promise<void> {
  await getRedisClient().eval(
    LOCK_RELEASE_SCRIPT,
    [lease.key],
    [lease.token]
  );
}

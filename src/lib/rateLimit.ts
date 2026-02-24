// Rate Limiting - Sliding Window Algorithm
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5

import { getRedisClient } from "./redis";
import type { RateLimitResult, RateLimitType } from "@/types";
import { RATE_LIMITS } from "@/types";

/**
 * Check rate limit for a given identifier and type using sliding window.
 *
 * windowId = Math.floor(Date.now() / windowMs)
 * Redis Key: ratelimit:{type}:{identifier}:{windowId}
 * EXPIRE = windowMs / 1000 + 1
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const { maxRequests, windowMs } = RATE_LIMITS[type];

  const windowId = Math.floor(Date.now() / windowMs);
  const key = `ratelimit:${type}:${identifier}:${windowId}`;
  const expireSeconds = Math.floor(windowMs / 1000) + 1;

  // Increment the counter for the current window
  const count = await redis.incr(key);

  // Set expiration on first request in this window
  if (count === 1) {
    await redis.expire(key, expireSeconds);
  }

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  // resetAt = start of next window in epoch ms
  const resetAt = (windowId + 1) * windowMs;

  return { allowed, remaining, resetAt };
}

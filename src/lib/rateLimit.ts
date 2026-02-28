// Rate Limiting - Sliding Window Algorithm (Edge Runtime compatible)
// Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
//
// Uses raw fetch against Upstash REST API instead of the @upstash/redis
// Node.js client, because this module is imported by middleware.ts which
// runs in the Edge Runtime where Node.js APIs are unavailable.

import type { RateLimitResult, RateLimitType } from "@/types";
import { RATE_LIMITS } from "@/types";

function parsePositiveInt(
  value: string | undefined,
  fallback: number
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getRateLimitConfig(type: RateLimitType): {
  maxRequests: number;
  windowMs: number;
} {
  const defaults = RATE_LIMITS[type];
  if (type === "api") {
    return {
      maxRequests: parsePositiveInt(
        process.env.RATE_LIMIT_API_MAX_REQUESTS,
        defaults.maxRequests
      ),
      windowMs: parsePositiveInt(
        process.env.RATE_LIMIT_API_WINDOW_MS,
        defaults.windowMs
      ),
    };
  }

  return {
    maxRequests: parsePositiveInt(
      process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS,
      defaults.maxRequests
    ),
    windowMs: parsePositiveInt(
      process.env.RATE_LIMIT_UPLOAD_WINDOW_MS,
      defaults.windowMs
    ),
  };
}

/**
 * Execute an Upstash Redis command via the REST API.
 * Works in both Node.js and Edge runtimes.
 */
async function redisCommand(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
  }

  const res = await fetch(`${url}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!res.ok) {
    throw new Error(`Upstash Redis error: ${res.status}`);
  }

  const data = await res.json();
  return data.result;
}

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
  const { maxRequests, windowMs } = getRateLimitConfig(type);

  const windowId = Math.floor(Date.now() / windowMs);
  const key = `ratelimit:${type}:${identifier}:${windowId}`;
  const expireSeconds = Math.floor(windowMs / 1000) + 1;

  // Increment the counter for the current window
  const countRaw = await redisCommand(["INCR", key]);
  const count = Number(countRaw);
  if (!Number.isFinite(count)) {
    throw new Error(`Unexpected INCR response from Upstash: ${String(countRaw)}`);
  }

  // Set expiration on first request in this window
  if (count <= 1) {
    await redisCommand(["EXPIRE", key, expireSeconds]);
  }

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  // resetAt = start of next window in epoch ms
  const resetAt = (windowId + 1) * windowMs;

  return { allowed, remaining, resetAt };
}

// Quota Management
// Requirements: 5.1-5.8

import { getRedisClient } from "./redis";
import type { UserTier, QuotaInfo, QuotaCheckResult } from "@/types";

// ── Key Helpers ─────────────────────────────────────────────────────────────

const keys = {
  quota: (userId: string) => `quota:${userId}`,
  dailyUsers: () => "quota:daily:users",
};

// ── Helper: next UTC midnight ───────────────────────────────────────────────

function getNextUtcMidnight(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return tomorrow.toISOString();
}

// ── Initialize Free Quota ───────────────────────────────────────────────────

/**
 * Initialize quota for a free user: remaining=1, dailyLimit=1.
 * Adds the userId to the daily reset set.
 * Req 5.1
 */
export async function initializeFreeQuota(userId: string): Promise<void> {
  const redis = getRedisClient();

  const quota: QuotaInfo = {
    userId,
    tier: "free",
    remaining: 1,
    dailyLimit: 1,
    resetAt: getNextUtcMidnight(),
    credits: 0,
    creditsExpireAt: null,
  };

  await redis.set(keys.quota(userId), JSON.stringify(quota));
  await redis.sadd(keys.dailyUsers(), userId);
}

// ── Clean Expired Credits ───────────────────────────────────────────────────

/**
 * Check if a user's credits have expired and zero them out if so.
 * Req 5.5 (credit expiration management)
 */
export async function cleanExpiredCredits(userId: string): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get<string>(keys.quota(userId));
  if (!raw) return;

  const quota = JSON.parse(raw) as QuotaInfo;

  if (
    quota.credits > 0 &&
    quota.creditsExpireAt &&
    new Date(quota.creditsExpireAt).getTime() < Date.now()
  ) {
    quota.credits = 0;
    quota.creditsExpireAt = null;
    await redis.set(keys.quota(userId), JSON.stringify(quota));
  }
}

// ── Check and Decrement Quota ───────────────────────────────────────────────

/**
 * Check whether the user has quota and decrement if allowed.
 * - professional: always allowed, no decrement
 * - pay_as_you_go: decrement credits (after cleaning expired)
 * - free: decrement daily remaining
 * Req 5.2, 5.3, 5.5, 5.6, 5.8
 */
export async function checkAndDecrementQuota(
  userId: string,
  userTier: UserTier
): Promise<QuotaCheckResult> {
  // Professional users: unlimited, no quota check
  if (userTier === "professional") {
    return { allowed: true, remaining: Infinity };
  }

  const redis = getRedisClient();

  // Clean expired credits first
  await cleanExpiredCredits(userId);

  const raw = await redis.get<string>(keys.quota(userId));
  if (!raw) {
    return { allowed: false, remaining: 0, reason: "Quota not initialized" };
  }

  const quota = JSON.parse(raw) as QuotaInfo;

  if (userTier === "pay_as_you_go") {
    if (quota.credits <= 0) {
      return { allowed: false, remaining: 0, reason: "No credits remaining" };
    }
    quota.credits -= 1;
    await redis.set(keys.quota(userId), JSON.stringify(quota));
    return { allowed: true, remaining: quota.credits };
  }

  // free tier
  if (quota.remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      reason: "Daily free quota exhausted",
    };
  }
  quota.remaining -= 1;
  await redis.set(keys.quota(userId), JSON.stringify(quota));
  return { allowed: true, remaining: quota.remaining };
}

// ── Get Quota Info ──────────────────────────────────────────────────────────

/**
 * Return the current quota information for a user.
 * Req 5.7
 */
export async function getQuotaInfo(userId: string): Promise<QuotaInfo> {
  const redis = getRedisClient();
  const raw = await redis.get<string>(keys.quota(userId));
  if (!raw) {
    // Return a default empty quota
    return {
      userId,
      tier: "free",
      remaining: 0,
      dailyLimit: null,
      resetAt: null,
      credits: 0,
      creditsExpireAt: null,
    };
  }
  return JSON.parse(raw) as QuotaInfo;
}

// ── Add Credits ─────────────────────────────────────────────────────────────

/**
 * Add credits to a user's quota (pay-as-you-go purchase).
 * Credits accumulate; expiration is refreshed to `expirationDays` from now.
 * Req 6.5
 */
export async function addCredits(
  userId: string,
  count: number,
  expirationDays: number
): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get<string>(keys.quota(userId));

  let quota: QuotaInfo;
  if (raw) {
    quota = JSON.parse(raw) as QuotaInfo;
  } else {
    quota = {
      userId,
      tier: "pay_as_you_go",
      remaining: 0,
      dailyLimit: null,
      resetAt: null,
      credits: 0,
      creditsExpireAt: null,
    };
  }

  quota.tier = "pay_as_you_go";
  quota.credits += count;
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() + expirationDays);
  quota.creditsExpireAt = expireDate.toISOString();

  await redis.set(keys.quota(userId), JSON.stringify(quota));

  // Remove from daily reset set since they're no longer free
  await redis.srem(keys.dailyUsers(), userId);
}

// ── Reset All Daily Quotas ──────────────────────────────────────────────────

/**
 * Reset all free users' daily quotas to 1.
 * Called by the quota-reset worker at UTC 00:00.
 * Req 5.4
 */
export async function resetAllDailyQuotas(): Promise<void> {
  const redis = getRedisClient();
  const userIds = await redis.smembers<string[]>(keys.dailyUsers());

  if (!userIds || userIds.length === 0) return;

  for (const userId of userIds) {
    const raw = await redis.get<string>(keys.quota(userId));
    if (!raw) continue;

    const quota = JSON.parse(raw) as QuotaInfo;
    quota.remaining = 1;
    quota.resetAt = getNextUtcMidnight();
    await redis.set(keys.quota(userId), JSON.stringify(quota));
  }
}

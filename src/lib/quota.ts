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

/** Safely parse quota data — handles both string and already-parsed object from Upstash */
function parseQuota(raw: unknown): QuotaInfo {
  if (typeof raw === "string") return JSON.parse(raw) as QuotaInfo;
  return raw as QuotaInfo;
}

// ── Initialize Free Quota ───────────────────────────────────────────────────

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

  await redis.set(keys.quota(userId), quota);
  await redis.sadd(keys.dailyUsers(), userId);
}

/**
 * Initialize free quota only when the user has no quota record yet.
 * This prevents resetting remaining quota on every login.
 */
export async function ensureFreeQuotaInitialized(userId: string): Promise<void> {
  const redis = getRedisClient();
  const existing = await redis.get(keys.quota(userId));
  if (existing) return;
  await initializeFreeQuota(userId);
}

// ── Clean Expired Credits ───────────────────────────────────────────────────

export async function cleanExpiredCredits(userId: string): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get(keys.quota(userId));
  if (!raw) return;

  const quota = parseQuota(raw);

  if (
    quota.credits > 0 &&
    quota.creditsExpireAt &&
    new Date(quota.creditsExpireAt).getTime() < Date.now()
  ) {
    quota.credits = 0;
    quota.creditsExpireAt = null;
    await redis.set(keys.quota(userId), quota);
  }
}

// ── Check and Decrement Quota ───────────────────────────────────────────────

export async function checkAndDecrementQuota(
  userId: string,
  userTier: UserTier
): Promise<QuotaCheckResult> {
  if (userTier === "professional") {
    return { allowed: true, remaining: Infinity };
  }

  const redis = getRedisClient();
  await cleanExpiredCredits(userId);

  const raw = await redis.get(keys.quota(userId));
  if (!raw) {
    if (userTier === "pay_as_you_go") {
      return { allowed: false, remaining: 0, reason: "No credits remaining" };
    }
    return { allowed: false, remaining: 0, reason: "Quota not initialized" };
  }

  const quota = parseQuota(raw);

  if (userTier === "pay_as_you_go") {
    if (quota.credits <= 0) {
      return { allowed: false, remaining: 0, reason: "No credits remaining" };
    }
    quota.credits -= 1;
    await redis.set(keys.quota(userId), quota);
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
  await redis.set(keys.quota(userId), quota);
  return { allowed: true, remaining: quota.remaining };
}

// ── Get Quota Info ──────────────────────────────────────────────────────────

export async function getQuotaInfo(userId: string): Promise<QuotaInfo> {
  const redis = getRedisClient();
  const raw = await redis.get(keys.quota(userId));
  if (!raw) {
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
  return parseQuota(raw);
}

// ── Add Credits ─────────────────────────────────────────────────────────────

export async function addCredits(
  userId: string,
  count: number,
  expirationDays: number
): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get(keys.quota(userId));

  let quota: QuotaInfo;
  if (raw) {
    quota = parseQuota(raw);
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

  await redis.set(keys.quota(userId), quota);
  await redis.srem(keys.dailyUsers(), userId);
}

export async function clearCredits(userId: string): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get(keys.quota(userId));
  if (!raw) return;

  const quota = parseQuota(raw);
  quota.credits = 0;
  quota.creditsExpireAt = null;

  await redis.set(keys.quota(userId), quota);
}

export async function resetFreeQuota(userId: string): Promise<void> {
  const redis = getRedisClient();
  const raw = await redis.get(keys.quota(userId));

  const quota: QuotaInfo = raw
    ? parseQuota(raw)
    : {
        userId,
        tier: "free",
        remaining: 0,
        dailyLimit: 1,
        resetAt: null,
        credits: 0,
        creditsExpireAt: null,
      };

  quota.remaining = 1;
  quota.dailyLimit = 1;
  quota.resetAt = getNextUtcMidnight();

  await redis.set(keys.quota(userId), quota);
  await redis.sadd(keys.dailyUsers(), userId);
}

// ── Reset All Daily Quotas ──────────────────────────────────────────────────

export async function resetAllDailyQuotas(): Promise<void> {
  const redis = getRedisClient();
  const userIds = await redis.smembers<string[]>(keys.dailyUsers());

  if (!userIds || userIds.length === 0) return;

  for (const userId of userIds) {
    const raw = await redis.get(keys.quota(userId));
    if (!raw) continue;

    const quota = parseQuota(raw);
    quota.remaining = 1;
    quota.resetAt = getNextUtcMidnight();
    await redis.set(keys.quota(userId), quota);
  }
}

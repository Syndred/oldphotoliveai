/**
 * Replicate spend guard — Redis-backed monthly budget.
 *
 * Replicate deprecated dashboard monthly spend limits (July 2025), so we enforce
 * an estimated monthly USD ceiling in-app before each model run.
 */

import { getRedisClient } from "./redis";
import type { ModelKey } from "./replicate";

/** Conservative overestimates (USD) so the guard trips before real spend. */
export const MODEL_COST_ESTIMATE_USD: Record<ModelKey, number> = {
  restoration: 0.02,
  restorationPremium: 0.05,
  colorization: 0.03,
  animationFree: 0.15,
  animationPaid: 0.2,
  animationPremium: 0.5,
};

export class ReplicateSpendLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplicateSpendLimitError";
  }
}

function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function spendRedisKey(date = new Date()): string {
  return `replicate:spend:${monthKey(date)}`;
}

export function getReplicateMonthlySpendLimitUsd(): number {
  const raw = process.env.REPLICATE_MONTHLY_SPEND_LIMIT_USD;
  const parsed = raw ? Number(raw) : 50;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

export function isReplicateSpendGuardEnabled(): boolean {
  const raw = process.env.REPLICATE_SPEND_GUARD_ENABLED;
  if (raw === undefined || raw === "") return true;
  return raw !== "0" && raw.toLowerCase() !== "false";
}

/**
 * Soft account probe — confirms the token works. Billing fields are not
 * returned by GET /v1/account; real budget enforcement is Redis-based.
 */
export async function probeReplicateAccount(): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN is not set");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch("https://api.replicate.com/v1/account", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[replicate-spend] account probe failed ${response.status}: ${body.slice(0, 300)}`
      );
    }
  } catch (error) {
    console.error("[replicate-spend] account probe error:", error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getEstimatedMonthlySpendUsd(): Promise<number> {
  const redis = getRedisClient();
  const value = await redis.get<string | number>(spendRedisKey());
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reserve estimated cost for a model run. Throws ReplicateSpendLimitError if
 * the monthly ceiling would be exceeded.
 */
export async function assertAndReserveReplicateSpend(
  modelKey: ModelKey
): Promise<void> {
  if (!isReplicateSpendGuardEnabled()) {
    return;
  }

  const estimate = MODEL_COST_ESTIMATE_USD[modelKey] ?? 0.1;
  const limit = getReplicateMonthlySpendLimitUsd();
  const redis = getRedisClient();
  const key = spendRedisKey();

  // Atomic increment then rollback if over limit.
  const next = await redis.incrbyfloat(key, estimate);
  // Expire ~40 days so keys don't accumulate forever.
  await redis.expire(key, 60 * 60 * 24 * 40);

  if (next > limit) {
    await redis.incrbyfloat(key, -estimate);
    throw new ReplicateSpendLimitError(
      `REPLICATE_SPEND_LIMIT:${next - estimate}/${limit}`
    );
  }
}

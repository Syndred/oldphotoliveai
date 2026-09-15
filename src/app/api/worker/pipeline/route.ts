// Pipeline Worker - Cron-triggered route
// Requirements: 3.1-3.10, 14.3, 18.5

import { after, NextResponse } from "next/server";
import { config } from "@/lib/config";
import {
  claimNextTask,
  getQueueLength,
  refreshTaskClaim,
  settleTaskClaim,
} from "@/lib/queue";
import type { TaskClaim } from "@/lib/queue";
import { acquireLock, releaseLock, refreshLock } from "@/lib/lock";
import type { LockLease } from "@/lib/lock";
import { executePipeline } from "@/lib/pipeline";
import { getTask } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import type { TaskStatus } from "@/types";

const LOCK_RENEW_INTERVAL_MS = 90_000;
const SELF_CHAIN_TRANSPORT_ATTEMPTS = 3;
const MAX_RECOVERY_CHAIN_ATTEMPTS = 3;
const RECOVERY_BACKOFF_MS = [5_000, 30_000, 120_000] as const;
const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

interface WorkerRecoveryState {
  recoveryClaim?: TaskClaim;
  recoveryLease?: LockLease;
  recoveryAttempt?: number;
  notBefore?: number;
}

export const maxDuration = 300;

function parseRecoveryClaim(value: unknown): TaskClaim | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.taskId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(candidate.taskId) ||
    typeof candidate.leaseMember !== "string" ||
    candidate.leaseMember.length < 1 ||
    candidate.leaseMember.length > 2048 ||
    typeof candidate.score !== "number" ||
    !Number.isFinite(candidate.score)
  ) {
    return undefined;
  }
  return {
    taskId: candidate.taskId,
    leaseMember: candidate.leaseMember,
    score: candidate.score,
  };
}

function parseRecoveryLease(value: unknown): LockLease | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.key !== "string" ||
    !/^lock:task:[a-zA-Z0-9_-]{1,128}$/.test(candidate.key) ||
    typeof candidate.token !== "string" ||
    candidate.token.length < 1 ||
    candidate.token.length > 128 ||
    typeof candidate.ttlSeconds !== "number" ||
    !Number.isSafeInteger(candidate.ttlSeconds) ||
    candidate.ttlSeconds < 1 ||
    candidate.ttlSeconds > 3600
  ) {
    return undefined;
  }
  return {
    key: candidate.key,
    token: candidate.token,
    ttlSeconds: candidate.ttlSeconds,
  };
}

async function readRecoveryState(request: Request): Promise<WorkerRecoveryState> {
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return {};
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const recoveryClaim = parseRecoveryClaim(body?.recoveryClaim);
  const recoveryLease = parseRecoveryLease(body?.recoveryLease);
  const recoveryAttempt =
    typeof body?.recoveryAttempt === "number" &&
    Number.isSafeInteger(body.recoveryAttempt) &&
    body.recoveryAttempt >= 0
      ? Math.min(body.recoveryAttempt, MAX_RECOVERY_CHAIN_ATTEMPTS)
      : undefined;
  const notBefore =
    typeof body?.notBefore === "number" &&
    Number.isSafeInteger(body.notBefore) &&
    body.notBefore >= 0
      ? body.notBefore
      : undefined;
  return {
    ...(recoveryClaim ? { recoveryClaim } : {}),
    ...(recoveryLease ? { recoveryLease } : {}),
    ...(recoveryAttempt !== undefined ? { recoveryAttempt } : {}),
    ...(notBefore !== undefined ? { notBefore } : {}),
  };
}

async function triggerNextTaskIfQueued(
  force = false,
  recovery?: WorkerRecoveryState
): Promise<void> {
  let shouldTrigger = force;
  try {
    const queueLen = await getQueueLength();
    shouldTrigger ||= queueLen.urgent + queueLen.high + queueLen.normal > 0;
  } catch (error) {
    console.error("Failed to inspect the pipeline queue before chaining:", error);
  }

  if (!shouldTrigger) return;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.worker.secret}`,
      ...(recovery ? { "Content-Type": "application/json" } : {}),
    },
    ...(recovery ? { body: JSON.stringify(recovery) } : {}),
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < SELF_CHAIN_TRANSPORT_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(
        `${baseUrl}/api/worker/pipeline`,
        requestInit
      );
      if (response.ok) return;
      lastError = new Error(`Pipeline self-chain returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  // The periodic cron is the durable fallback after bounded immediate retries.
  console.error("Failed to trigger the next pipeline worker:", lastError);
}

async function runPipelineWorker(recovery: WorkerRecoveryState): Promise<void> {
  let claim: Awaited<ReturnType<typeof claimNextTask>> = null;
  let lease: Awaited<ReturnType<typeof acquireLock>> = null;
  let renewInterval: ReturnType<typeof setInterval> | undefined;
  let executionError: unknown;
  let lockConflict = false;

  try {
    // A previous worker may have failed while settling after Redis had already
    // accepted the claim. Retrying the tokenized settlement is idempotent and
    // makes that task ready before this invocation claims new work.
    let recoveryError: unknown;
    if (recovery.recoveryClaim) {
      try {
        await settleTaskClaim(recovery.recoveryClaim);
      } catch (error) {
        recoveryError = error;
      }
    }
    if (recovery.recoveryLease) {
      try {
        await releaseLock(recovery.recoveryLease);
      } catch (error) {
        recoveryError ??= error;
      }
    }
    if (recoveryError) throw recoveryError;

    // Step 2: Atomically lease the next task. Expired claims are recovered first.
    claim = await claimNextTask();
    if (claim) {
      const { taskId } = claim;

      // Step 3: Acquire distributed lock.
      lease = await acquireLock(`lock:task:${taskId}`);
      if (lease) {
        // Keep both leases alive for long-running tasks.
        renewInterval = setInterval(async () => {
          try {
            const [lockRenewed, claimRenewed] = await Promise.all([
              refreshLock(lease!),
              refreshTaskClaim(claim!),
            ]);
            if (!lockRenewed) {
              console.warn(`Failed to renew lock for task ${taskId}: lease not owned`);
            }
            if (!claimRenewed) {
              console.warn(`Failed to renew queue claim for task ${taskId}: claim not owned`);
            }
          } catch (error) {
            console.error(`Failed to renew worker leases for task ${taskId}:`, error);
          }
        }, LOCK_RENEW_INTERVAL_MS);

        // Recovered terminal claims are acknowledged without re-execution.
        const task = await getTask(taskId);
        if (task && !TERMINAL_STATUSES.has(task.status)) {
          await executePipeline(taskId);
        }
      } else {
        lockConflict = true;
      }
    }
  } catch (error) {
    executionError = error;
  } finally {
    if (renewInterval) {
      clearInterval(renewInterval);
    }
    if (claim) {
      // Cleanup steps are independent: neither a settlement failure nor a lock
      // release failure may prevent the other step or the successor wake-up.
      try {
        await settleTaskClaim(claim);
      } catch (error) {
        console.error(`Failed to settle queue claim for task ${claim.taskId}:`, error);
        executionError ??= error;
      }

      if (lease) {
        try {
          await releaseLock(lease);
        } catch (error) {
          console.error(`Failed to release lock for task ${claim.taskId}:`, error);
          executionError ??= error;
        }
      }

      // Errors can emit a globally bounded recovery successor. Ordinary lock
      // conflicts stop here and wait for an observer wakeup or the daily cron.
    }

    const wakeClaim = claim ?? recovery.recoveryClaim;
    const wakeLease = lease ?? recovery.recoveryLease;
    if ((wakeClaim || wakeLease) && executionError) {
      const recoveryAttempt = recovery.recoveryAttempt ?? 0;
      if (recoveryAttempt < MAX_RECOVERY_CHAIN_ATTEMPTS) {
        await triggerNextTaskIfQueued(true, {
          ...(wakeClaim ? { recoveryClaim: wakeClaim } : {}),
          ...(wakeLease ? { recoveryLease: wakeLease } : {}),
          recoveryAttempt: recoveryAttempt + 1,
          notBefore: Date.now() + RECOVERY_BACKOFF_MS[recoveryAttempt],
        });
      }
    } else if ((wakeClaim || wakeLease) && !lockConflict) {
      await triggerNextTaskIfQueued();
    }
  }

  if (executionError) throw executionError;
}

function schedulePipelineWorker(
  recovery: WorkerRecoveryState
): NextResponse {
  if (recovery.notBefore !== undefined && recovery.notBefore > Date.now()) {
    return NextResponse.json(
      { status: "deferred", notBefore: recovery.notBefore },
      { status: 202 }
    );
  }

  // `after` binds the work to the platform request lifecycle while allowing the
  // dispatch endpoint to respond before a long-running pipeline task finishes.
  after(() => runPipelineWorker(recovery));
  return NextResponse.json({ status: "scheduled" }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${config.worker.secret}`) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  const recovery = await readRecoveryState(request);
  return schedulePipelineWorker(recovery);
}

export async function GET(request: Request): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  return schedulePipelineWorker({});
}

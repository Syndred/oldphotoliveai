// Pipeline Worker - Cron-triggered route
// Requirements: 3.1-3.10, 14.3, 18.5

import { NextResponse } from "next/server";
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
const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

interface WorkerRecoveryState {
  recoveryClaim?: TaskClaim;
  recoveryLease?: LockLease;
}

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
  return {
    ...(recoveryClaim ? { recoveryClaim } : {}),
    ...(recoveryLease ? { recoveryLease } : {}),
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

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.worker.secret}`,
        ...(recovery ? { "Content-Type": "application/json" } : {}),
      },
      ...(recovery
        ? { body: JSON.stringify(recovery) }
        : {}),
    }).catch(() => {
      // A future task creation or worker invocation will recover the leased work.
    });
  } catch (error) {
    // Chaining is best-effort and must never replace the worker's root error.
    console.error("Failed to trigger the next pipeline worker:", error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const locale = getRequestLocale(request);

  // Step 1: Verify Worker Secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${config.worker.secret}`) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  let claim: Awaited<ReturnType<typeof claimNextTask>> = null;
  let lease: Awaited<ReturnType<typeof acquireLock>> = null;
  let renewInterval: ReturnType<typeof setInterval> | undefined;
  let executionError: unknown;
  let response: NextResponse | undefined;
  let lockConflict = false;
  const recovery = await readRecoveryState(request);

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
    if (!claim) {
      response = NextResponse.json(
        { message: "No tasks in queue" },
        { status: 200 }
      );
    } else {
      const { taskId } = claim;

      // Step 3: Acquire distributed lock.
      lease = await acquireLock(`lock:task:${taskId}`);
      if (!lease) {
        lockConflict = true;
        response = NextResponse.json(
          { message: getErrorMessage("serviceBusy", locale) },
          { status: 200 }
        );
      } else {
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

        response = NextResponse.json(
          { taskId, status: "processed" },
          { status: 200 }
        );
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

      // Force a successor on any failure. This remains live even when queue
      // inspection is the operation that failed, and lets the next invocation
      // recover a requeued or expired claim without a pipeline cron.
    }

    const wakeClaim = claim ?? recovery.recoveryClaim;
    const wakeLease = lease ?? recovery.recoveryLease;
    if ((wakeClaim || wakeLease) && (!lockConflict || executionError)) {
      await triggerNextTaskIfQueued(
        Boolean(executionError),
        executionError
          ? {
              ...(wakeClaim ? { recoveryClaim: wakeClaim } : {}),
              ...(wakeLease ? { recoveryLease: wakeLease } : {}),
            }
          : undefined
      );
    }
  }

  if (executionError) throw executionError;
  if (!response) throw new Error("Pipeline worker completed without a response");
  return response;
}

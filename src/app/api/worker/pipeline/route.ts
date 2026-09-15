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
import { acquireLock, releaseLock, refreshLock } from "@/lib/lock";
import { executePipeline } from "@/lib/pipeline";
import { getTask } from "@/lib/redis";
import { beginTaskExecution } from "@/lib/task-execution";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import type { TaskStatus } from "@/types";

const LOCK_RENEW_INTERVAL_MS = 90_000;
const SELF_CHAIN_TRANSPORT_ATTEMPTS = 3;
const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

export const maxDuration = 300;

async function triggerNextTaskIfQueued(): Promise<void> {
  let shouldTrigger = false;
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
    },
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

async function runPipelineWorker(): Promise<void> {
  let claim: Awaited<ReturnType<typeof claimNextTask>> = null;
  let lease: Awaited<ReturnType<typeof acquireLock>> = null;
  let renewInterval: ReturnType<typeof setInterval> | undefined;
  let executionError: unknown;
  let lockConflict = false;

  try {
    // Step 2: Atomically lease the next task. Expired claims are recovered first.
    claim = await claimNextTask();
    if (claim) {
      const { taskId } = claim;

      // Step 3: Acquire distributed lock.
      lease = await acquireLock(`lock:task:${taskId}`);
      if (lease) {
        const executionController = new AbortController();
        let ownershipLost = false;
        const stopForOwnershipLoss = (reason: string, error?: unknown) => {
          if (ownershipLost) return;
          ownershipLost = true;
          if (error) {
            console.error(`Lost worker ownership for task ${taskId}: ${reason}`, error);
          } else {
            console.warn(`Lost worker ownership for task ${taskId}: ${reason}`);
          }
          executionController.abort();
        };

        // Keep both leases alive for long-running tasks.
        renewInterval = setInterval(async () => {
          try {
            const [lockRenewed, claimRenewed] = await Promise.all([
              refreshLock(lease!),
              refreshTaskClaim(claim!),
            ]);
            if (!lockRenewed) {
              stopForOwnershipLoss("lock lease not owned");
            }
            if (!claimRenewed) {
              stopForOwnershipLoss("queue claim not owned");
            }
          } catch (error) {
            stopForOwnershipLoss("lease renewal failed", error);
          }
        }, LOCK_RENEW_INTERVAL_MS);

        // Recovered terminal claims are acknowledged without re-execution.
        const task = await getTask(taskId);
        if (task && !TERMINAL_STATUSES.has(task.status)) {
          const beginResult = await beginTaskExecution(taskId, claim, lease);
          if (beginResult === "started") {
            await executePipeline(taskId, {
              executionToken: claim.leaseMember,
              signal: executionController.signal,
            });
          }
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

      // Failed settlement leaves the processing lease intact. A later observer
      // wakeup or the daily cron lets claimNextTask recover it after expiry.
    }

    if (claim && !executionError && !lockConflict) {
      await triggerNextTaskIfQueued();
    }
  }

  if (executionError) throw executionError;
}

function schedulePipelineWorker(): NextResponse {
  // `after` binds the work to the platform request lifecycle while allowing the
  // dispatch endpoint to respond before a long-running pipeline task finishes.
  after(runPipelineWorker);
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

  return schedulePipelineWorker();
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

  return schedulePipelineWorker();
}

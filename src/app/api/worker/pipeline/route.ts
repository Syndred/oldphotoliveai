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
import { acquireLock, releaseLock, refreshLock } from "@/lib/lock";
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

async function triggerNextTaskIfQueued(): Promise<void> {
  try {
    const queueLen = await getQueueLength();
    if (queueLen.urgent + queueLen.high + queueLen.normal === 0) return;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.worker.secret}`,
      },
    }).catch(() => {
      // A future task creation or worker invocation will recover the leased work.
    });
  } catch (error) {
    // Queue chaining is best-effort. Claim settlement remains the source of
    // truth, so a chaining failure must not mask the task's execution result.
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

  // Step 2: Atomically lease the next task. Expired claims are recovered first.
  const claim = await claimNextTask();
  if (!claim) {
    return NextResponse.json({ message: "No tasks in queue" }, { status: 200 });
  }
  const { taskId } = claim;

  // Step 3: Acquire distributed lock
  const lockKey = `lock:task:${taskId}`;
  const lease = await acquireLock(lockKey);
  if (!lease) {
    // Another worker owns this task. Returning the claim is atomic and cannot
    // overwrite a newer queue entry.
    await settleTaskClaim(claim);
    return NextResponse.json(
      { message: getErrorMessage("serviceBusy", locale) },
      { status: 200 }
    );
  }

  let renewInterval: ReturnType<typeof setInterval> | undefined;
  let executionError: unknown;

  try {
    // Keep lock alive for long-running tasks.
    renewInterval = setInterval(async () => {
      try {
        const [lockRenewed, claimRenewed] = await Promise.all([
          refreshLock(lease),
          refreshTaskClaim(claim),
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

    // A worker can crash after completing a task but before acknowledging its
    // claim. Recovered terminal tasks must be acknowledged, never rerun.
    const task = await getTask(taskId);
    if (task && !TERMINAL_STATUSES.has(task.status)) {
      await executePipeline(taskId);
    }
  } catch (error) {
    executionError = error;
  } finally {
    if (renewInterval) {
      clearInterval(renewInterval);
    }
    // Step 6: Terminal tasks are acknowledged; unfinished tasks are restored
    // to the ready queue. Always release the task lock even if settlement fails.
    try {
      await settleTaskClaim(claim);
    } finally {
      await releaseLock(lease);
    }
  }

  // Step 5: Self-chain after settlement so an unexpectedly unfinished task is
  // visible in the ready queue before the next worker starts.
  await triggerNextTaskIfQueued();

  if (executionError) throw executionError;

  return NextResponse.json(
    { taskId, status: "processed" },
    { status: 200 }
  );
}

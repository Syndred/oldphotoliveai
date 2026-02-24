// Pipeline Worker - Cron-triggered route
// Requirements: 3.1-3.10, 14.3, 18.5

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { dequeueTask } from "@/lib/queue";
import { acquireLock, releaseLock } from "@/lib/lock";
import { executePipeline } from "@/lib/pipeline";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

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

  // Step 2: Dequeue task from priority queue
  const taskId = await dequeueTask();
  if (!taskId) {
    return NextResponse.json({ message: "No tasks in queue" }, { status: 200 });
  }

  // Step 3: Acquire distributed lock
  const lockKey = `lock:task:${taskId}`;
  const locked = await acquireLock(lockKey);
  if (!locked) {
    return NextResponse.json(
      { message: getErrorMessage("serviceBusy", locale) },
      { status: 200 }
    );
  }

  try {
    // Step 4: Execute pipeline
    await executePipeline(taskId);

    return NextResponse.json(
      { taskId, status: "processed" },
      { status: 200 }
    );
  } finally {
    // Step 5: Always release lock
    await releaseLock(lockKey);
  }
}

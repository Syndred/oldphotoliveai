// Create Task API Route
// Requirements: 4.1, 4.6, 4.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createTask, getUser } from "@/lib/redis";
import { enqueueTask } from "@/lib/queue";
import { checkAndDecrementQuota } from "@/lib/quota";
import { getTaskPriorityForTier } from "@/lib/taskPriority";
import { isSafeTaskStorageKey } from "@/lib/validation";
import type { TaskPriority, UserTier } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

function resolveQuotaErrorKey(reason: string | undefined, tier: UserTier): string {
  if (reason === "No credits remaining") {
    return "creditsExpired";
  }

  if (reason === "Daily free quota exhausted") {
    return "quotaExceeded";
  }

  if (reason === "Quota not initialized") {
    return tier === "pay_as_you_go" ? "creditsExpired" : "quotaExceeded";
  }

  return tier === "pay_as_you_go" ? "creditsExpired" : "quotaExceeded";
}

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    // 1. Get authenticated user from JWT token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    const userId = token?.userId as string | undefined;

    if (!userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    // 2. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
    }
    const { imageKey } = body as { imageKey?: string };

    // 3. Validate required fields
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      return NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
    }
    const normalizedImageKey = imageKey.trim();
    if (!isSafeTaskStorageKey(normalizedImageKey)) {
      return NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
    }

    // 4. Get user to determine priority
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 404 }
      );
    }

    // 5. Check and decrement quota before creating a task
    const quotaResult = await checkAndDecrementQuota(userId, user.tier);
    if (!quotaResult.allowed) {
      const errorKey = resolveQuotaErrorKey(quotaResult.reason, user.tier);
      return NextResponse.json(
        { error: getErrorMessage(errorKey, locale) },
        { status: 403 }
      );
    }

    // 6. Determine priority based on tier
    const priority: TaskPriority = getTaskPriorityForTier(user.tier);

    // 7. Create task record in Redis (status: pending)
    const task = await createTask({
      userId,
      originalImageKey: normalizedImageKey,
      priority,
    });

    // 8. Enqueue task for processing
    await enqueueTask(task.id, priority);

    // 9. Fire-and-forget: trigger worker pipeline
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
    }).catch(() => {
      // Ignore errors - worker will pick up task on next cron cycle
    });

    // 10. Return task ID
    return NextResponse.json({ taskId: task.id }, { status: 201 });
  } catch (error) {
    console.error("Create task failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("taskCreateFailed", locale) },
      { status: 500 }
    );
  }
}

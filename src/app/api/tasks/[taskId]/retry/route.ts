// Task Retry API Route
// Requirements: 4.2, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { getAccessibleTask } from "@/lib/task-access";
import { retryTaskAtomic } from "@/lib/task-retry";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const locale = getRequestLocale(request);

  try {
    const { taskId } = params;

    const accessibleTask = await getAccessibleTask(request, taskId);
    if (!accessibleTask) {
      return NextResponse.json(
        { error: getErrorMessage("taskNotFound", locale) },
        { status: 404 }
      );
    }
    const { task, mode } = accessibleTask;

    if (task.violation) {
      return NextResponse.json(
        {
          error: getErrorMessage("retryFailed", locale),
          code: "CONTENT_VIOLATION",
          allowanceConsumed: true,
        },
        { status: 400 }
      );
    }

    const result = await retryTaskAtomic(task);
    if (result.outcome === "rejected") {
      return NextResponse.json(
        { error: getErrorMessage("retryFailed", locale), code: result.code },
        { status: 400 }
      );
    }

    // Fire-and-forget trigger to avoid "enqueued but not started" gaps.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
    }).catch(() => {
      // Ignore errors - cron/new tasks can trigger pipeline later.
    });

    return NextResponse.json({
      message: "Task queued for retry",
      task: {
        id: task.id,
        status: "queued",
        progress: 5,
        attemptCount: result.attemptCount,
        accessMode: mode,
      },
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "task_retry_failed",
      route: "/api/tasks/:taskId/retry",
      requestId: request.headers.get("x-vercel-id") || undefined,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      { error: getErrorMessage("retryFailed", locale) },
      { status: 500 }
    );
  }
}

// Task Retry API Route
// Requirements: 4.2, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTaskOwnedByUser, retryTask } from "@/lib/redis";
import { enqueueTask } from "@/lib/queue";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const locale = getRequestLocale(request);

  try {
    const { taskId } = params;

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

    const task = await getTaskOwnedByUser(taskId, userId);
    if (!task) {
      return NextResponse.json(
        { error: getErrorMessage("taskNotFound", locale) },
        { status: 404 }
      );
    }

    if (task.status !== "failed") {
      return NextResponse.json(
        { error: getErrorMessage("retryFailed", locale) },
        { status: 400 }
      );
    }

    const updatedTask = await retryTask(taskId);

    // Re-enqueue the task so the worker picks it up
    await enqueueTask(taskId, updatedTask.priority);

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
        id: updatedTask.id,
        status: updatedTask.status,
        progress: updatedTask.progress,
      },
    });
  } catch (error) {
    console.error("Retry task failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("retryFailed", locale) },
      { status: 500 }
    );
  }
}

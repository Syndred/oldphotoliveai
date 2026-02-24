// Task Retry API Route
// Requirements: 4.2, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getTask, retryTask } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const locale = getRequestLocale(request);

  try {
    const { taskId } = params;

    const task = await getTask(taskId);
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

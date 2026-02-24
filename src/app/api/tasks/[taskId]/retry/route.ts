// Task Retry API Route
// Requirements: 4.2

import { NextRequest, NextResponse } from "next/server";
import { getTask, retryTask } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    const task = await getTask(taskId);
    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    if (task.status !== "failed") {
      return NextResponse.json(
        { error: "Only failed tasks can be retried" },
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
      { error: "Failed to retry task" },
      { status: 500 }
    );
  }
}

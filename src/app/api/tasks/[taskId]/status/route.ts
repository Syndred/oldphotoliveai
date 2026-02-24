// Task Status Query API Route
// Requirements: 4.3

import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/redis";

export async function GET(
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

    const response: Record<string, unknown> = {
      status: task.status,
      progress: task.progress,
    };

    if (task.errorMessage) {
      response.errorMessage = task.errorMessage;
    }
    if (task.restoredImageKey) {
      response.restoredImageKey = task.restoredImageKey;
    }
    if (task.colorizedImageKey) {
      response.colorizedImageKey = task.colorizedImageKey;
    }
    if (task.animationVideoKey) {
      response.animationVideoKey = task.animationVideoKey;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get task status failed:", error);
    return NextResponse.json(
      { error: "Failed to get task status" },
      { status: 500 }
    );
  }
}

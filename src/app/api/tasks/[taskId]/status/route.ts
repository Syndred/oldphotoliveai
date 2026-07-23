// Task Status Query API Route
// Requirements: 4.3, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { getAccessibleTask } from "@/lib/task-access";

export async function GET(
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

    const response: Record<string, unknown> = {
      status: task.status,
      progress: task.progress,
      workflow: task.workflow ?? "full",
      accessMode: mode,
    };

    if (task.errorMessage) {
      response.errorMessage = task.errorMessage;
    }
    if (task.originalImageKey) {
      response.originalImageKey = task.originalImageKey;
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
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 500 }
    );
  }
}

// Task Status Query API Route
// Requirements: 4.3, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { getAccessibleTask } from "@/lib/task-access";
import { toPublicTaskStatus } from "@/lib/task-status";

export async function GET(request: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
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
    return NextResponse.json(
      toPublicTaskStatus(accessibleTask.task, accessibleTask.mode)
    );
  } catch (error) {
    console.error("Get task status failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 500 }
    );
  }
}

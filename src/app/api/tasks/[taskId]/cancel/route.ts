// Task Cancel API Route
// Requirements: 4.2, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getTask, cancelTask } from "@/lib/redis";
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

    const cancelled = await cancelTask(taskId);
    if (!cancelled) {
      return NextResponse.json(
        { error: getErrorMessage("cannotCancel", locale) },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Task cancelled successfully" });
  } catch (error) {
    console.error("Cancel task failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("cannotCancel", locale) },
      { status: 500 }
    );
  }
}

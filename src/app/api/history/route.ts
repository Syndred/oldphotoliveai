// History API Route
// Requirements: 8.1, 8.2, 8.4, 8.5, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUserTasks, deleteTask } from "@/lib/redis";
import { getR2CdnUrl, deleteTaskFiles } from "@/lib/r2";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function GET(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    const userId = token.userId as string;
    const tasks = await getUserTasks(userId);

    // getUserTasks already sorts by createdAt descending
    const mapped = tasks.map((task) => ({
      id: task.id,
      status: task.status,
      progress: task.progress,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      thumbnailUrl: task.originalImageKey
        ? getR2CdnUrl(task.originalImageKey)
        : null,
      errorMessage: task.status === "failed" ? task.errorMessage : null,
    }));

    return NextResponse.json({ tasks: mapped });
  } catch (error) {
    console.error("Get history failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("historyLoadFailed", locale) },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    const userId = token.userId as string;
    const body = await request.json();
    const taskIds: string[] = body.taskIds;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: getErrorMessage("taskIdsRequired", locale) },
        { status: 400 }
      );
    }

    // Limit batch size
    if (taskIds.length > 50) {
      return NextResponse.json(
        { error: getErrorMessage("taskBatchTooLarge", locale) },
        { status: 400 }
      );
    }

    const results: { id: string; deleted: boolean }[] = [];

    for (const taskId of taskIds) {
      try {
        // Delete R2 files first
        await deleteTaskFiles(taskId);
        // Delete from Redis
        const deleted = await deleteTask(taskId, userId);
        results.push({ id: taskId, deleted });
      } catch {
        results.push({ id: taskId, deleted: false });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Delete history failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("historyLoadFailed", locale) },
      { status: 500 }
    );
  }
}

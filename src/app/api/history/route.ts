// History API Route
// Requirements: 8.1, 8.2, 8.4, 8.5, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUserTasks, deleteTask, getTaskOwnedByUser } from "@/lib/redis";
import { deleteTaskFiles } from "@/lib/r2";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { buildTaskAssetUrl } from "@/lib/task-assets";

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
        ? buildTaskAssetUrl(task.id, "original")
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: getErrorMessage("taskIdsRequired", locale) },
        { status: 400 }
      );
    }
    const rawTaskIds = (body as { taskIds?: unknown }).taskIds;

    if (!Array.isArray(rawTaskIds) || rawTaskIds.length === 0) {
      return NextResponse.json(
        { error: getErrorMessage("taskIdsRequired", locale) },
        { status: 400 }
      );
    }

    const taskIds = Array.from(
      new Set(
        rawTaskIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0 && id.length <= 128)
      )
    );

    if (taskIds.length === 0) {
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
        // Verify ownership before deleting files to prevent IDOR-style abuse.
        const task = await getTaskOwnedByUser(taskId, userId);
        if (!task) {
          results.push({ id: taskId, deleted: false });
          continue;
        }

        await deleteTaskFiles(taskId, [
          task.originalImageKey,
          task.restoredImageKey,
          task.colorizedImageKey,
          task.animationVideoKey,
        ]);

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

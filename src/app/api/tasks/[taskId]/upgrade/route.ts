import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUser } from "@/lib/redis";
import { getAccessibleTask } from "@/lib/task-access";
import { getTaskGenerationTier } from "@/lib/task-status";
import { getExistingTaskUpgrade } from "@/lib/task-creation";
import { createTaskUpgrade } from "@/lib/task-upgrade";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

import { schedulePipelineWakeupForStatus } from "@/lib/worker-wakeup";

export async function POST(request: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const locale = getRequestLocale(request);
  const reject = (status: number, code: string, errorKey: string) => NextResponse.json({
    error: getErrorMessage(errorKey, locale), code, allowanceConsumed: false,
  }, { status });
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.userId as string | undefined;
    if (!userId) return reject(401, "UNAUTHORIZED", "unauthorized");
    const { taskId } = await props.params;
    const accessible = await getAccessibleTask(request, taskId);
    if (!accessible) return reject(404, "TASK_NOT_FOUND", "taskNotFound");
    const source = accessible.task;
    if (source.status !== "completed" || source.violation || getTaskGenerationTier(source) !== "free") {
      return reject(400, "INVALID_UPGRADE", "taskCreateFailed");
    }
    const existingTaskId = await getExistingTaskUpgrade(userId, source);
    if (existingTaskId) {
      schedulePipelineWakeupForStatus("pending");
      return NextResponse.json({ taskId: existingTaskId, replayed: true, allowanceConsumed: false });
    }
    const user = await getUser(userId);
    if (!user) return reject(401, "UNAUTHORIZED", "unauthorized");
    if (user.tier === "free") return reject(403, "PAYMENT_REQUIRED", "quotaExceeded");
    const result = await createTaskUpgrade(user, source);
    if (result.outcome === "rejected") return reject(403, result.code, "creditsExpired");
    const upgradedTaskId = result.outcome === "created" ? result.task.id : result.taskId;
    schedulePipelineWakeupForStatus("pending");
    return NextResponse.json({
      taskId: upgradedTaskId,
      replayed: result.outcome === "existing",
      allowanceConsumed: result.outcome === "created",
    }, { status: result.outcome === "created" ? 201 : 200 });
  } catch (error) {
    console.error(JSON.stringify({ level: "error", message: "task_upgrade_failed", errorType: error instanceof Error ? error.name : "UnknownError" }));
    return NextResponse.json({ error: getErrorMessage("taskCreateFailed", locale), code: "INTERNAL_ERROR", allowanceConsumed: null }, { status: 500 });
  }
}

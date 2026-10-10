// Task Status Query API Route
// Requirements: 4.3, 18.5

import { after, NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getExistingTaskUpgrade } from "@/lib/task-creation";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { getAccessibleTask } from "@/lib/task-access";
import { toPublicTaskStatus } from "@/lib/task-status";
import { schedulePipelineWakeupForStatus } from "@/lib/worker-wakeup";
import { needsPhotoOrderRefundRecovery, reconcileTaskPhotoOrderRefund } from "@/lib/photo-order-refund";

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
    schedulePipelineWakeupForStatus(accessibleTask.task.status);
    if (needsPhotoOrderRefundRecovery(accessibleTask.task)) {
      after(async () => {
        try { await reconcileTaskPhotoOrderRefund(taskId); }
        catch { console.error(JSON.stringify({ message: "photo_refund_status_recovery_failed" })); }
      });
    }
    const publicStatus = toPublicTaskStatus(accessibleTask.task, accessibleTask.mode, accessibleTask.downloadUnlocked);
    if (publicStatus.canUpgrade) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const requesterId = typeof token?.userId === "string" ? token.userId : undefined;
      if (requesterId) {
        const existingUpgradeTaskId = await getExistingTaskUpgrade(requesterId, accessibleTask.task);
        if (existingUpgradeTaskId) publicStatus.existingUpgradeTaskId = existingUpgradeTaskId;
      }
    }
    return NextResponse.json(publicStatus, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("Get task status failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 500 }
    );
  }
}

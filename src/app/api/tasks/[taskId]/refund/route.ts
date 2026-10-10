import { after, NextRequest, NextResponse } from "next/server";
import { getAccessibleTask } from "@/lib/task-access";
import { getTask } from "@/lib/redis";
import { reconcileTaskPhotoOrderRefund } from "@/lib/photo-order-refund";

export async function POST(request: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { taskId } = await props.params;
    const access = await getAccessibleTask(request, taskId);
    if (!access || access.mode !== "authenticated" || !access.task.purchaseOrderId) {
      return NextResponse.json({ code: "TASK_NOT_FOUND" }, { status: 404, headers });
    }
    if (access.task.violation) return NextResponse.json({ code: "CONTENT_VIOLATION" }, { status: 409, headers });
    await reconcileTaskPhotoOrderRefund(taskId, { process: false });
    const current = await getTask(taskId);
    if (!current?.refundStatus) {
      return NextResponse.json({ code: current?.status === "failed" ? "RETRY_AVAILABLE" : "NOT_ELIGIBLE" }, { status: 409, headers });
    }
    if (current.refundStatus === "pending") {
      after(async () => {
        try { await reconcileTaskPhotoOrderRefund(taskId); }
        catch { console.error(JSON.stringify({ message: "photo_refund_request_recovery_failed" })); }
      });
    }
    return NextResponse.json({ taskId, refundStatus: current.refundStatus }, { status: current.refundStatus === "pending" ? 202 : 200, headers });
  } catch {
    return NextResponse.json({ code: "REFUND_UNCONFIRMED" }, { status: 503, headers });
  }
}

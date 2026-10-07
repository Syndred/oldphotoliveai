import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAccessibleTask } from "@/lib/task-access";
import { getStripeClient } from "@/lib/stripe";
import { fulfillPaidCheckout } from "@/lib/checkout-fulfillment";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { TaskCheckoutReviewRequiredError, getTaskCheckoutReviewResponse, assertTaskDownloadMastersAvailable, getTaskDownloadGrant, getPendingTaskDownloadCheckout, recoverTaskDownloadCheckoutSession, releaseExpiredTaskDownloadCheckout, unlockTaskDownload } from "@/lib/task-download";

export async function POST(request: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const locale = getRequestLocale(request);
  const reject = (code: string, status = 409) => NextResponse.json({ error: getErrorMessage(code === "UNAUTHORIZED" ? "unauthorized" : "checkoutFailed", locale), code, creditsDebited: 0 }, { status });
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.userId) return reject("UNAUTHORIZED", 401);
    const userId = String(token.userId);
    const { taskId } = await props.params;
    const accessible = await getAccessibleTask(request, taskId);
    if (!accessible) return reject("TASK_NOT_FOUND", 404);
    const task = accessible.task;
    if (task.status !== "completed" || task.violation) return reject("RESULT_UNAVAILABLE", 404);
    const existing = await getTaskDownloadGrant(taskId);
    if (existing && existing.userId !== userId) return reject("TASK_ALREADY_CLAIMED");
    const paidTier = task.generationTier ?? (task.priority === "urgent" ? "professional" : task.priority === "high" ? "pay_as_you_go" : "free");
    if (paidTier === "free") await assertTaskDownloadMastersAvailable(task);
    if (!existing) {
      const pending = await getPendingTaskDownloadCheckout(taskId);
      if (pending) {
        if (pending.userId !== userId) return reject("CHECKOUT_PENDING");
        let session = await recoverTaskDownloadCheckoutSession(pending);
        if (session.payment_status === "paid") {
          await fulfillPaidCheckout(session);
        } else {
          // Choosing a credit unlock cancels this user's still-open single purchase,
          // so a second tab cannot later charge $1.99 for the same entitlement.
          if (session.status === "open") session = await getStripeClient().checkout.sessions.expire(session.id);
          if (session.status !== "expired" || session.payment_status !== "unpaid") return reject("PAYMENT_PROCESSING");
          await releaseExpiredTaskDownloadCheckout(pending);
        }
      }
    }
    const result = await unlockTaskDownload({ userId, taskId, ownerUserId: task.userId });
    if (result.outcome === "REJECTED" || result.outcome === "ERROR") return reject(result.code ?? "INTERNAL_ERROR", result.code === "NO_CREDITS" || result.code === "CREDITS_EXPIRED" ? 403 : 409);
    return NextResponse.json({ unlocked: true, taskId, replayed: result.outcome !== "GRANTED", creditsDebited: result.outcome === "GRANTED" ? result.grant?.creditsDebited ?? 0 : 0 });
  } catch (error) {
    if (error instanceof TaskCheckoutReviewRequiredError) return NextResponse.json(getTaskCheckoutReviewResponse(locale), { status: 409 });
    return NextResponse.json({ error: getErrorMessage("checkoutFailed", locale), code: "UNLOCK_UNCONFIRMED", creditsDebited: null }, { status: 503 });
  }
}

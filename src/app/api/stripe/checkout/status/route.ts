import { schedulePipelineWakeupForStatus } from "@/lib/worker-wakeup";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { config } from "@/lib/config";
import { getStripeClient } from "@/lib/stripe";
import { getCheckoutReceipt, getCheckoutRefundRequired, fulfillPaidCheckout } from "@/lib/checkout-fulfillment";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!config.stripe.isEnabled) return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId || !/^cs_[a-zA-Z0-9_]{1,240}$/.test(sessionId)) return NextResponse.json({ error: "Invalid session" }, { status: 400, headers });
  try {
    const session = await getStripeClient().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.userId !== String(token.userId) || (session.client_reference_id && session.client_reference_id !== String(token.userId)) || session.metadata?.product !== "oldphotoliveai") {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    }
    if (session.payment_status !== "paid") return NextResponse.json({ status: "pending" }, { headers });
    if (session.metadata.plan === "single_photo" || session.metadata.plan === "single_run") await fulfillPaidCheckout(session);
    if (session.metadata.plan === "single_run") schedulePipelineWakeupForStatus("pending");
    const receipt = await getCheckoutReceipt(sessionId);
    if (!receipt && session.metadata.plan === "single_photo") {
      const refund = await getCheckoutRefundRequired(sessionId);
      if (refund?.userId === String(token.userId)) return NextResponse.json({ status: "refund_required", taskId: refund.taskId }, { headers });
    }
    if (!receipt || receipt.userId !== String(token.userId) || receipt.plan !== session.metadata.plan) return NextResponse.json({ status: "processing" }, { headers });
    return NextResponse.json({
      status: "fulfilled",
      transactionId: createHash("sha256").update(sessionId).digest("hex"),
      plan: receipt.plan,
      creditsAdded: receipt.creditsAdded,
      fulfillmentKind: receipt.fulfillmentKind ?? (receipt.plan === "professional" ? "professional" : "credits"),
      unlockedTaskId: receipt.unlockedTaskId,
      assetScope: receipt.assetScope,
      amountTotal: receipt.amountTotal,
      currency: receipt.currency,
      fulfilledAt: receipt.fulfilledAt,
      locale: receipt.locale,
      taskId: receipt.taskId,
      orderId: receipt.orderId,
      returnTo: receipt.returnTo,
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 503, headers });
  }
}

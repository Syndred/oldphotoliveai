import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUser } from "@/lib/redis";
import { getAnonymousVisitorId } from "@/lib/anonymous";
import { isUploadOwned } from "@/lib/upload-receipt";
import { isSafeTaskStorageKey } from "@/lib/validation";
import { checkoutLocale } from "@/lib/checkout-context";
import { assertPhotoOrderSourceExists, createPhotoOrder, isPhotoOrderWorkflow } from "@/lib/photo-order";
import { TaskCheckoutReviewRequiredError, getTaskCheckoutReviewResponse } from "@/lib/task-download";

export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid order" }, { status: 400, headers }); }
  if (!body || typeof body !== "object" || typeof body.imageKey !== "string" || !isSafeTaskStorageKey(body.imageKey) || !isPhotoOrderWorkflow(body.workflow)) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400, headers });
  }
  const locale = checkoutLocale(body.locale);
  const userId = String(token.userId);
  try {
    if (!await getUser(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    if (!await isUploadOwned(body.imageKey, { userId, visitorId: getAnonymousVisitorId(request) ?? undefined })) return NextResponse.json({ error: "Photo not found" }, { status: 404, headers });
    await assertPhotoOrderSourceExists(body.imageKey);
    const { order, created } = await createPhotoOrder({ userId, imageKey: body.imageKey, workflow: body.workflow, locale });
    return NextResponse.json({ orderId: order.id, taskId: order.taskId, status: order.status }, { status: created ? 201 : 200, headers });
  } catch (error) {
    if (error instanceof TaskCheckoutReviewRequiredError) return NextResponse.json(getTaskCheckoutReviewResponse(locale), { status: 409, headers });
    const storageError = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (storageError?.name === "NotFound" || storageError?.name === "NoSuchKey" || storageError?.$metadata?.httpStatusCode === 404 || (error instanceof Error && error.message === "SOURCE_UNAVAILABLE")) return NextResponse.json({ code: "SOURCE_UNAVAILABLE", error: "Photo unavailable. Please upload it again." }, { status: 404, headers });
    return NextResponse.json({ error: "Unable to create order. Please try again." }, { status: 503, headers });
  }
}

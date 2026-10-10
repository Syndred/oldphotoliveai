import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getPhotoOrderOwnedByUser, isPhotoOrderId } from "@/lib/photo-order";
import { getTask } from "@/lib/redis";

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const { orderId } = await context.params;
  if (!isPhotoOrderId(orderId)) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  try {
    const order = await getPhotoOrderOwnedByUser(orderId, String(token.userId));
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    const task = order.status !== "unpaid" ? await getTask(order.taskId) : null;
    return NextResponse.json({ orderId: order.id, taskId: order.taskId, workflow: order.workflow, status: order.status,
      taskStatus: task?.userId === order.userId ? task.status : undefined,
      price: { amountTotal: order.amountTotal, currency: order.currency, displayPrice: "$1.99" },
      refund: order.refund ? { status: order.refund.status } : undefined,
    }, { headers });
  } catch { return NextResponse.json({ error: "Unable to read order" }, { status: 503, headers }); }
}

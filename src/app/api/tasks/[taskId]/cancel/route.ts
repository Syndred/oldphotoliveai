// Task Cancel API Route
// Requirements: 4.2, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTaskOwnedByUser, cancelTask } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const locale = getRequestLocale(request);

  try {
    const { taskId } = params;

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const userId = token?.userId as string | undefined;
    if (!userId) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 401 }
      );
    }

    const task = await getTaskOwnedByUser(taskId, userId);
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

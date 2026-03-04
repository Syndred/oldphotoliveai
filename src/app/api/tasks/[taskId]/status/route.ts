// Task Status Query API Route
// Requirements: 4.3, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTaskOwnedByUser } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function GET(
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

    const response: Record<string, unknown> = {
      status: task.status,
      progress: task.progress,
    };

    if (task.errorMessage) {
      response.errorMessage = task.errorMessage;
    }
    if (task.originalImageKey) {
      response.originalImageKey = task.originalImageKey;
    }
    if (task.restoredImageKey) {
      response.restoredImageKey = task.restoredImageKey;
    }
    if (task.colorizedImageKey) {
      response.colorizedImageKey = task.colorizedImageKey;
    }
    if (task.animationVideoKey) {
      response.animationVideoKey = task.animationVideoKey;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get task status failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 500 }
    );
  }
}

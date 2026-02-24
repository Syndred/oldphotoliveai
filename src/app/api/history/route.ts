// History API Route
// Requirements: 8.1, 8.2, 8.4, 8.5, 18.5

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUserTasks } from "@/lib/redis";
import { getR2CdnUrl } from "@/lib/r2";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

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
        ? getR2CdnUrl(task.originalImageKey)
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

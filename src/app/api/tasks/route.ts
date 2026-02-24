// Create Task API Route
// Requirements: 4.1, 4.6, 4.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { createTask, getUser } from "@/lib/redis";
import type { TaskPriority } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);

  try {
    // 1. Get authenticated user from JWT token
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

    // 2. Parse JSON body
    const body = await request.json();
    const { imageKey } = body as { imageKey?: string };

    // 3. Validate required fields
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      return NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
    }

    // 4. Get user to determine priority
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        { error: getErrorMessage("unauthorized", locale) },
        { status: 404 }
      );
    }

    // 5. Determine priority based on tier
    const priority: TaskPriority = user.tier === "free" ? "normal" : "high";

    // 6. Create task record in Redis (status: pending)
    const task = await createTask({
      userId,
      originalImageKey: imageKey.trim(),
      priority,
    });

    // 7. Return task ID
    return NextResponse.json({ taskId: task.id }, { status: 201 });
  } catch (error) {
    console.error("Create task failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("taskCreateFailed", locale) },
      { status: 500 }
    );
  }
}

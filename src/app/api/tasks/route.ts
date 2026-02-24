// Create Task API Route
// Requirements: 4.1, 4.6, 4.7

import { NextRequest, NextResponse } from "next/server";
import { createTask, getUser } from "@/lib/redis";
import type { TaskPriority } from "@/types";

// Hardcoded test user ID (skip auth for MVP testing)
const DEFAULT_TEST_USER_ID = "test-user-001";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    const body = await request.json();
    const { imageKey, userId } = body as {
      imageKey?: string;
      userId?: string;
    };

    // 2. Validate required fields
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      return NextResponse.json(
        { error: "imageKey is required" },
        { status: 400 }
      );
    }

    // 3. Resolve user ID (hardcoded fallback for MVP)
    const resolvedUserId = userId || DEFAULT_TEST_USER_ID;

    // 4. Get user to determine priority
    const user = await getUser(resolvedUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 5. Determine priority based on tier
    const priority: TaskPriority =
      user.tier === "free" ? "normal" : "high";

    // 6. Create task record in Redis (status: pending)
    const task = await createTask({
      userId: resolvedUserId,
      originalImageKey: imageKey.trim(),
      priority,
    });

    // 7. Return task ID
    return NextResponse.json({ taskId: task.id }, { status: 201 });
  } catch (error) {
    console.error("Create task failed:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

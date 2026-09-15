// Create Task API Route
// Requirements: 4.1, 4.6, 4.7, 18.5

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getUser } from "@/lib/redis";
import { isSafeTaskStorageKey } from "@/lib/validation";
import type { TaskWorkflow } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { createAuthenticatedTaskAtomic } from "@/lib/task-creation";

const TASK_WORKFLOWS: readonly TaskWorkflow[] = [
  "full",
  "restore",
  "colorize",
  "animate",
];

function parseTaskWorkflow(value: unknown): TaskWorkflow {
  return TASK_WORKFLOWS.includes(value as TaskWorkflow)
    ? (value as TaskWorkflow)
    : "full";
}

function resolveQuotaErrorKey(code: string): string {
  if (code === "NO_CREDITS") {
    return "creditsExpired";
  }
  return "quotaExceeded";
}

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
        {
          error: getErrorMessage("unauthorized", locale),
          code: "UNAUTHORIZED",
          stage: "authorization",
          allowanceConsumed: false,
        },
        { status: 401 }
      );
    }

    // 2. Parse JSON body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
    }
    const { imageKey, workflow: requestedWorkflow } = body as {
      imageKey?: string;
      workflow?: unknown;
    };
    const workflow = parseTaskWorkflow(requestedWorkflow);

    // 3. Validate required fields
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      return NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
    }
    const normalizedImageKey = imageKey.trim();
    if (!isSafeTaskStorageKey(normalizedImageKey)) {
      return NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
    }

    // 4. Get user to determine priority
    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json(
        {
          error: getErrorMessage("unauthorized", locale),
          code: "UNAUTHORIZED",
          stage: "authorization",
          allowanceConsumed: false,
        },
        { status: 401 }
      );
    }

    // 5. Commit allowance, task record, history, queue and replay marker together.
    const creation = await createAuthenticatedTaskAtomic({
      user,
      imageKey: normalizedImageKey,
      workflow,
    });
    if (creation.outcome === "rejected") {
      const errorKey = resolveQuotaErrorKey(creation.code);
      return NextResponse.json(
        {
          error: getErrorMessage(errorKey, locale),
          code: creation.code,
          stage: "authorization",
          allowanceConsumed: false,
        },
        { status: 403 }
      );
    }

    const taskId = creation.outcome === "created" ? creation.task.id : creation.taskId;

    // 9. Fire-and-forget: trigger worker pipeline
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
    }).catch(() => {
      // Ignore errors - worker will pick up task on next cron cycle
    });

    // 10. Return task ID
    return NextResponse.json(
      {
        taskId,
        replayed: creation.outcome === "existing",
        allowanceConsumed: creation.outcome === "created",
      },
      { status: creation.outcome === "created" ? 201 : 200 }
    );
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "task_create_failed",
      route: "/api/tasks",
      requestId: request.headers.get("x-vercel-id") || undefined,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    return NextResponse.json(
      {
        error: getErrorMessage("taskCreateFailed", locale),
        code: "INTERNAL_ERROR",
        stage: "creation",
        allowanceConsumed: null,
      },
      { status: 500 }
    );
  }
}

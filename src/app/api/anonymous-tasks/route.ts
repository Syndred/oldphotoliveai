import { NextRequest, NextResponse } from "next/server";
import {
  createAnonymousVisitorId,
  getAnonymousVisitorId,
  setAnonymousVisitorCookie,
  ANONYMOUS_TRIAL_USED_ERROR,
} from "@/lib/anonymous";
import { isSafeTaskStorageKey } from "@/lib/validation";
import { getErrorMessage, getRequestLocale } from "@/lib/i18n-api";
import { createAnonymousTaskAtomic } from "@/lib/task-creation";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const visitorId = getAnonymousVisitorId(request) ?? createAnonymousVisitorId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const { imageKey } = body as { imageKey?: string };
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      const response = NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const normalizedImageKey = imageKey.trim();
    if (!isSafeTaskStorageKey(normalizedImageKey)) {
      const response = NextResponse.json(
        {
          error: getErrorMessage("taskCreateFailed", locale),
          code: "INVALID_INPUT",
          stage: "validation",
          allowanceConsumed: false,
        },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const creation = await createAnonymousTaskAtomic({
      visitorId,
      imageKey: normalizedImageKey,
    });
    if (creation.outcome === "rejected") {
      const response = NextResponse.json(
        {
          error: ANONYMOUS_TRIAL_USED_ERROR,
          code: "ANONYMOUS_TRIAL_USED",
          stage: "authorization",
          allowanceConsumed: false,
        },
        { status: 403 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const taskId = creation.outcome === "created" ? creation.task.id : creation.taskId;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/worker/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
    }).catch(() => {
      // The scheduled worker can pick this up later if the wake-up fails.
    });

    const response = NextResponse.json(
      {
        taskId,
        accessMode: "anonymous",
        watermark: true,
        maxQuality: "480p",
        replayed: creation.outcome === "existing",
        allowanceConsumed: creation.outcome === "created",
      },
      { status: creation.outcome === "created" ? 201 : 200 }
    );
    setAnonymousVisitorCookie(response, visitorId);
    return response;
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "anonymous_task_create_failed",
      route: "/api/anonymous-tasks",
      requestId: request.headers.get("x-vercel-id") || undefined,
      errorType: error instanceof Error ? error.name : "UnknownError",
    }));
    const response = NextResponse.json(
      {
        error: getErrorMessage("taskCreateFailed", locale),
        code: "INTERNAL_ERROR",
        stage: "creation",
        allowanceConsumed: null,
      },
      { status: 500 }
    );
    setAnonymousVisitorCookie(response, visitorId);
    return response;
  }
}

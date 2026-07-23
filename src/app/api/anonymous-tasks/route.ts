import { NextRequest, NextResponse } from "next/server";
import {
  createAnonymousVisitorId,
  getAnonymousVisitorId,
  setAnonymousVisitorCookie,
} from "@/lib/anonymous";
import { enqueueTask } from "@/lib/queue";
import {
  claimAnonymousTrial,
  createOrGetAnonymousUser,
  createTask,
  getAnonymousTrialTaskId,
  recordAnonymousTrialTask,
} from "@/lib/redis";
import { isSafeTaskStorageKey } from "@/lib/validation";
import { getErrorMessage, getRequestLocale } from "@/lib/i18n-api";

const ANONYMOUS_TRIAL_USED_ERROR =
  "You have already used your free no-login trial. Sign up for HD and unlimited animations.";

export async function POST(request: NextRequest) {
  const locale = getRequestLocale(request);
  const visitorId = getAnonymousVisitorId(request) ?? createAnonymousVisitorId();

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const response = NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const { imageKey } = body as { imageKey?: string };
    if (!imageKey || typeof imageKey !== "string" || imageKey.trim() === "") {
      const response = NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const normalizedImageKey = imageKey.trim();
    if (!isSafeTaskStorageKey(normalizedImageKey)) {
      const response = NextResponse.json(
        { error: getErrorMessage("taskCreateFailed", locale) },
        { status: 400 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const existingTrialTaskId = await getAnonymousTrialTaskId(visitorId);
    if (existingTrialTaskId) {
      const response = NextResponse.json(
        {
          error: ANONYMOUS_TRIAL_USED_ERROR,
          code: "ANONYMOUS_TRIAL_USED",
          taskId:
            existingTrialTaskId === "claimed" ? undefined : existingTrialTaskId,
        },
        { status: 403 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const claimed = await claimAnonymousTrial(visitorId);
    if (!claimed) {
      const response = NextResponse.json(
        {
          error: ANONYMOUS_TRIAL_USED_ERROR,
          code: "ANONYMOUS_TRIAL_USED",
        },
        { status: 403 }
      );
      setAnonymousVisitorCookie(response, visitorId);
      return response;
    }

    const user = await createOrGetAnonymousUser(visitorId);
    const task = await createTask({
      userId: user.id,
      originalImageKey: normalizedImageKey,
      priority: "normal",
      workflow: "animate",
    });

    await recordAnonymousTrialTask(visitorId, task.id);
    await enqueueTask(task.id, task.priority);

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
        taskId: task.id,
        accessMode: "anonymous",
        watermark: true,
        maxQuality: "480p",
      },
      { status: 201 }
    );
    setAnonymousVisitorCookie(response, visitorId);
    return response;
  } catch (error) {
    console.error("Create anonymous task failed:", error);
    const response = NextResponse.json(
      { error: getErrorMessage("taskCreateFailed", locale) },
      { status: 500 }
    );
    setAnonymousVisitorCookie(response, visitorId);
    return response;
  }
}

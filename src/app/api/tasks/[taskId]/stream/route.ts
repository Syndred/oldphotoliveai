// SSE Task Status Stream API Route
// Requirements: 4.2, 4.3, 18.5

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getTaskOwnedByUser } from "@/lib/redis";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;
  const locale = getRequestLocale(request);
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

  const initialTask = await getTaskOwnedByUser(taskId, userId);
  if (!initialTask) {
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const intervals: {
        poll?: ReturnType<typeof setInterval>;
        heartbeat?: ReturnType<typeof setInterval>;
      } = {};
      let closed = false;
      let lastEventPayload = "";

      const close = () => {
        if (closed) return;
        closed = true;
        if (intervals.poll) clearInterval(intervals.poll);
        if (intervals.heartbeat) clearInterval(intervals.heartbeat);
        controller.close();
      };

      const sendEvent = (data: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const sendHeartbeat = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      };

      const poll = async (): Promise<boolean> => {
        try {
          const task = await getTaskOwnedByUser(taskId, userId);
          if (!task) {
            sendEvent({ error: getErrorMessage("taskNotFound", locale) });
            return true; // stop polling
          }

          const eventData: Record<string, unknown> = {
            status: task.status,
            progress: task.progress,
          };

          if (task.errorMessage) {
            eventData.errorMessage = task.errorMessage;
          }
          if (task.originalImageKey) {
            eventData.originalImageKey = task.originalImageKey;
          }
          if (task.restoredImageKey) {
            eventData.restoredImageKey = task.restoredImageKey;
          }
          if (task.colorizedImageKey) {
            eventData.colorizedImageKey = task.colorizedImageKey;
          }
          if (task.animationVideoKey) {
            eventData.animationVideoKey = task.animationVideoKey;
          }

          const payload = JSON.stringify(eventData);
          if (payload !== lastEventPayload) {
            lastEventPayload = payload;
            sendEvent(eventData);
          }

          // Close connection on terminal states
          if (
            task.status === "completed" ||
            task.status === "failed" ||
            task.status === "cancelled"
          ) {
            return true;
          }

          return false;
        } catch {
          sendEvent({ error: getErrorMessage("taskNotFound", locale) });
          return true;
        }
      };

      // Initial poll
      const shouldStop = await poll();
      if (shouldStop) {
        close();
        return;
      }

      // Continue polling at interval
      intervals.poll = setInterval(async () => {
        try {
          const done = await poll();
          if (done) {
            close();
          }
        } catch {
          close();
        }
      }, POLL_INTERVAL_MS);

      intervals.heartbeat = setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// SSE Task Status Stream API Route
// Requirements: 4.2, 4.3, 18.5

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";
import { getAccessibleTask, type TaskAccessMode } from "@/lib/task-access";
import { toPublicTaskStatus } from "@/lib/task-status";
import { requestPipelineWakeupForStatus } from "@/lib/worker-wakeup";

const POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(request: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  const params = await props.params;
  const { taskId } = params;
  const locale = getRequestLocale(request);
  const initialAccessibleTask = await getAccessibleTask(request, taskId);
  if (!initialAccessibleTask) {
    return NextResponse.json(
      { error: getErrorMessage("taskNotFound", locale) },
      { status: 404 }
    );
  }
  // Complete one bounded dispatch attempt before the long-lived response starts;
  // `after()` would otherwise wait until this SSE connection closes.
  await requestPipelineWakeupForStatus(initialAccessibleTask.task.status);
  const accessMode: TaskAccessMode = initialAccessibleTask.mode;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const intervals: {
        poll?: ReturnType<typeof setInterval>;
        heartbeat?: ReturnType<typeof setInterval>;
      } = {};
      let closed = false;
      let lastEventPayload = "";
      let polling = false;

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
        if (polling) return false;
        polling = true;
        try {
          const accessibleTask = await getAccessibleTask(request, taskId);
          if (!accessibleTask) {
            sendEvent({ transportError: "access_lost" });
            return true; // stop polling
          }
          const { task } = accessibleTask;
          const eventData = toPublicTaskStatus(task, accessMode);

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
          sendEvent({ transportError: "status_unavailable" });
          return false;
        } finally {
          polling = false;
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

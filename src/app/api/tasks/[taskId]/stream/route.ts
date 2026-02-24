// SSE Task Status Stream API Route
// Requirements: 4.2, 4.3

import { NextRequest } from "next/server";
import { getTask } from "@/lib/redis";

const POLL_INTERVAL_MS = 2000;

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const poll = async (): Promise<boolean> => {
        try {
          const task = await getTask(taskId);
          if (!task) {
            sendEvent({ error: "Task not found" });
            return true; // stop polling
          }

          const eventData: Record<string, unknown> = {
            status: task.status,
            progress: task.progress,
          };

          if (task.errorMessage) {
            eventData.errorMessage = task.errorMessage;
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

          sendEvent(eventData);

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
          sendEvent({ error: "Failed to fetch task status" });
          return true;
        }
      };

      // Initial poll
      const shouldStop = await poll();
      if (shouldStop) {
        controller.close();
        return;
      }

      // Continue polling at interval
      const interval = setInterval(async () => {
        try {
          const done = await poll();
          if (done) {
            clearInterval(interval);
            controller.close();
          }
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, POLL_INTERVAL_MS);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
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

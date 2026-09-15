import { after } from "next/server";
import { config } from "@/lib/config";
import { getRedisClient } from "@/lib/redis";
import type { TaskStatus } from "@/types";

const WORKER_WAKEUP_THROTTLE_KEY = "worker:pipeline:wakeup";
const WORKER_WAKEUP_THROTTLE_SECONDS = 60;
const WORKER_WAKEUP_TIMEOUT_MS = 2_000;
const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

async function dispatchPipelineWakeup(signal: AbortSignal): Promise<void> {
  const redis = getRedisClient();
  const acquired = await redis.set(WORKER_WAKEUP_THROTTLE_KEY, "1", {
    nx: true,
    ex: WORKER_WAKEUP_THROTTLE_SECONDS,
  });
  if (acquired !== "OK") return;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/worker/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.worker.secret}`,
    },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Throttled pipeline wakeup returned ${response.status}`);
  }
}

export async function requestPipelineWakeupForStatus(
  status: TaskStatus
): Promise<void> {
  if (TERMINAL_STATUSES.has(status)) return;

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      dispatchPipelineWakeup(controller.signal),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Pipeline wakeup timed out"));
        }, WORKER_WAKEUP_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Keep an acquired marker until its TTL expires. A later observation can
    // retry without turning Redis or dispatch outages into request storms.
    console.error("Failed to request a throttled pipeline wakeup:", error);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function schedulePipelineWakeupForStatus(status: TaskStatus): void {
  if (TERMINAL_STATUSES.has(status)) return;
  after(() => requestPipelineWakeupForStatus(status));
}

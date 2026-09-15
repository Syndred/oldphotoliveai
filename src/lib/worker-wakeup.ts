import { after } from "next/server";
import { config } from "@/lib/config";
import { getRedisClient } from "@/lib/redis";
import type { TaskStatus } from "@/types";

const WORKER_WAKEUP_THROTTLE_KEY = "worker:pipeline:wakeup";
const WORKER_WAKEUP_THROTTLE_SECONDS = 60;
const TERMINAL_STATUSES = new Set<TaskStatus>([
  "completed",
  "failed",
  "cancelled",
]);

async function requestPipelineWakeup(): Promise<void> {
  try {
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
    });
    if (!response.ok) {
      console.error(`Throttled pipeline wakeup returned ${response.status}`);
    }
  } catch (error) {
    // Keep the throttle marker until its TTL expires. Polling can try again
    // later without turning a Redis or dispatch outage into a request storm.
    console.error("Failed to request a throttled pipeline wakeup:", error);
  }
}

export function schedulePipelineWakeupForStatus(status: TaskStatus): void {
  if (TERMINAL_STATUSES.has(status)) return;
  after(requestPipelineWakeup);
}

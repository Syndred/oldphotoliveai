// Cleanup Worker - Cron-triggered route
// Requirements: 11.6, 18.5

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getRedisClient, hardDeleteTask } from "@/lib/redis";
import { deleteTaskFiles } from "@/lib/r2";
import { removeFromQueue } from "@/lib/queue";
import type { Task } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseTaskRecord(raw: unknown): Task | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseTaskRecord(parsed);
    } catch {
      return null;
    }
  }

  if (typeof raw !== "object") return null;
  const candidate = raw as Partial<Task>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.userId !== "string" ||
    typeof candidate.status !== "string" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return candidate as Task;
}

function isPrimaryTaskKey(key: string): boolean {
  const parts = key.split(":");
  return parts.length === 2 && parts[0] === "task";
}

async function cleanupFailedTasks(): Promise<number> {
  const redis = getRedisClient();
  const now = Date.now();
  let cleaned = 0;
  let cursor = "0";

  do {
    const [nextCursor, taskKeys] = await redis.scan(cursor, {
      match: "task:*",
      count: 100,
    });
    cursor = String(nextCursor);

    for (const key of taskKeys) {
      if (!isPrimaryTaskKey(key)) continue;

      const raw = await redis.get<unknown>(key);
      const task = parseTaskRecord(raw);
      if (!task || task.status !== "failed") continue;

      const anchorTime = task.completedAt ?? task.createdAt;
      const anchorTimestamp = new Date(anchorTime).getTime();
      if (!Number.isFinite(anchorTimestamp)) continue;
      if (now - anchorTimestamp <= SEVEN_DAYS_MS) continue;

      try {
        await deleteTaskFiles(task.id, [
          task.originalImageKey,
          task.restoredImageKey,
          task.colorizedImageKey,
          task.animationVideoKey,
        ]);
        await hardDeleteTask(task.id);
        await removeFromQueue(task.id);
        cleaned++;
      } catch (error) {
        console.error(`Cleanup failed for task ${task.id}:`, error);
      }
    }
  } while (cursor !== "0");

  return cleaned;
}

export async function POST(request: Request): Promise<NextResponse> {
  const locale = getRequestLocale(request);

  // Step 1: Verify Worker Secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${config.worker.secret}`) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  try {
    const cleaned = await cleanupFailedTasks();

    return NextResponse.json(
      { message: `Cleaned ${cleaned} failed task(s)` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cleanup worker failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("serviceBusy", locale) },
      { status: 500 }
    );
  }
}


/**
 * GET handler for Vercel Cron Jobs.
 * Vercel cron sends GET requests. We verify using CRON_SECRET.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const locale = getRequestLocale(request);
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: getErrorMessage("unauthorized", locale) },
      { status: 401 }
    );
  }

  try {
    const cleaned = await cleanupFailedTasks();

    return NextResponse.json(
      { message: `Cleaned ${cleaned} failed task(s)` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cleanup worker failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("serviceBusy", locale) },
      { status: 500 }
    );
  }
}

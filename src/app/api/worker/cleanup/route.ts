// Cleanup Worker - Cron-triggered route
// Requirements: 11.6, 18.5

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getRedisClient } from "@/lib/redis";
import { deleteTaskFiles } from "@/lib/r2";
import type { Task } from "@/types";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
    const redis = getRedisClient();
    const now = Date.now();
    let cleaned = 0;
    let cursor: string | number = 0;

    // Step 2: Scan for task keys and find failed ones older than 7 days
    do {
      const [nextCursor, taskKeys] = await redis.scan(cursor, {
        match: "task:*",
        count: 100,
      });
      cursor = nextCursor as unknown as number;

      for (const key of taskKeys) {
        // Skip non-task keys (e.g. user task sorted sets)
        if (key.includes(":") && key.split(":").length > 2) continue;

        const raw = await redis.get<string>(key);
        if (!raw) continue;

        const task = JSON.parse(raw) as Task;
        if (task.status !== "failed") continue;

        const createdAt = new Date(task.createdAt).getTime();
        if (now - createdAt > SEVEN_DAYS_MS) {
          await deleteTaskFiles(task.id);
          cleaned++;
        }
      }
    } while (cursor !== 0);

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
    const redis = getRedisClient();
    const now = Date.now();
    let cleaned = 0;
    let cursor: string | number = 0;

    do {
      const [nextCursor, taskKeys] = await redis.scan(cursor, {
        match: "task:*",
        count: 100,
      });
      cursor = nextCursor as unknown as number;

      for (const key of taskKeys) {
        if (key.includes(":") && key.split(":").length > 2) continue;
        const raw = await redis.get<string>(key);
        if (!raw) continue;
        const task = JSON.parse(raw) as Task;
        if (task.status !== "failed") continue;
        const createdAt = new Date(task.createdAt).getTime();
        if (now - createdAt > SEVEN_DAYS_MS) {
          await deleteTaskFiles(task.id);
          cleaned++;
        }
      }
    } while (cursor !== 0);

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

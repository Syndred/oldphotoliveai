// Quota Reset Worker - Cron-triggered route
// Requirements: 5.4
// Triggered by Vercel Cron daily at UTC 00:00.
// Resets all free users' daily quotas to 1.

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { resetAllDailyQuotas } from "@/lib/quota";

export async function POST(request: Request): Promise<NextResponse> {
  // Step 1: Verify Worker Secret
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${config.worker.secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 2: Reset all free user daily quotas
    await resetAllDailyQuotas();

    return NextResponse.json(
      { message: "Daily quotas reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Quota reset failed:", error);
    return NextResponse.json(
      { error: "Failed to reset quotas" },
      { status: 500 }
    );
  }
}

// Quota Reset Worker - Cron-triggered route
// Requirements: 5.4, 18.5

import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { resetAllDailyQuotas } from "@/lib/quota";
import { getRequestLocale, getErrorMessage } from "@/lib/i18n-api";

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
    // Step 2: Reset all free user daily quotas
    await resetAllDailyQuotas();

    return NextResponse.json(
      { message: "Daily quotas reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Quota reset failed:", error);
    return NextResponse.json(
      { error: getErrorMessage("serviceBusy", locale) },
      { status: 500 }
    );
  }
}
